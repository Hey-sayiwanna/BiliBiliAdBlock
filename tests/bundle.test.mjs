import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import gRPC from "@nsnanocat/grpc";
import { Console } from "@nsnanocat/util";
import { AIRelateReply } from "@biliverse/protobuf/bilibili/app/viewunite/v1/airelate.js";
import { DynAllPersonalReply } from "@biliverse/protobuf/bilibili/app/dynamic/v2/dynamic.js";
import { MainListReply } from "@biliverse/protobuf/bilibili/main/community/reply/v1/reply.js";
import { TFInfoReply } from "@biliverse/protobuf/bilibili/app/view/v1/view.js";
import { PlayViewUniteReply } from "@biliverse/protobuf/bilibili/app/playerunite/v1/playerunite.js";
import { FragmentType } from "@biliverse/protobuf/bilibili/playershared/playershared.js";
import { SearchAllResponse } from "@biliverse/protobuf/bilibili/polymer/app/search/v1/search.js";
import { runSurge } from "./surge-runtime.mjs";
Console.logLevel = "OFF";

const binary = body => ({ status: 200, headers: { "content-type": "application/grpc", "grpc-encoding": "gzip" }, body });
const service = "https://grpc.biliapi.net/bilibili.app.viewunite.v1.View/";
function frame(payload, compressed) {
  if (!compressed) return gRPC.encode(payload);
  const body = gzipSync(payload);
  const header = Buffer.alloc(5);
  header[0] = 1;
  header.writeUInt32BE(body.length, 1);
  return Uint8Array.from(Buffer.concat([header, body]));
}

for (const compressed of [false, true]) {
  test(`published AIRelateAsync script removes ads and preserves normal cards, unknown fields and status (gzip=${compressed})`, async () => {
    const unknown = [0xa0, 0x06, 0x07];
    const payload = AIRelateReply.toBinary(AIRelateReply.create({ cm: {}, tab: { modules: [{ type: 28, data: {
      oneofKind: "relates", relates: { cards: [{ relateCardType: 1 }, { relateCardType: 5 }, { relateCardType: 99 }] },
    } }] } }));
    const result = await runSurge(`${service}AIRelateAsync`, binary(frame(Uint8Array.from([...payload, ...unknown]), compressed)));
    const bytes = gRPC.decode(result.body);
    const decoded = AIRelateReply.fromBinary(bytes);
    assert.equal(decoded.cm, undefined);
    assert.deepEqual(decoded.tab.modules[0].data.relates.cards.map(card => card.relateCardType), [1, 99]);
    assert.deepEqual(Array.from(bytes.slice(-3)), unknown);
    assert.equal(result.headers["grpc-status"], "0");
  });
}

for (const method of ["PlayPause", "ViewEndPage"]) {
  test(`published ${method} script returns a valid empty gRPC message`, async () => {
    const result = await runSurge(`${service}${method}`, binary(gRPC.encode(Uint8Array.from([8, 1]))));
    assert.deepEqual(Array.from(result.body), [0, 0, 0, 0, 0]);
    assert.equal(result.headers["grpc-status"], "0");
  });
}

test("published dynamic script removes ads even when stale BoxJS settings disabled filtering", async () => {
  const input = DynAllPersonalReply.toBinary(DynAllPersonalReply.create({ list: [{ cardType: 15 }, { cardType: 8 }] }));
  const result = await runSurge("https://app.biliapi.com/bilibili.app.dynamic.v2.Dynamic/DynAllPersonal", binary(gRPC.encode(input)), {
    persisted: JSON.stringify({ ADBlock: { Settings: { Dynamic: { PersonalAdCard: false } } } }),
  });
  assert.deepEqual(DynAllPersonalReply.fromBinary(gRPC.decode(result.body)).list.map(card => card.cardType), [8]);
});

test("published comment script removes commercial cards and keeps ordinary comments", async () => {
  const payload = MainListReply.toBinary(MainListReply.create({
    cm: {}, replies: [{ id: 1n, content: { message: "正常评论" } }],
    topReplies: [{ id: 2n, content: { message: "https://b23.tv/cm123" } }],
  }));
  const result = await runSurge("https://grpc.biliapi.net/bilibili.main.community.reply.v1.Reply/MainList", binary(gRPC.encode(payload)));
  const decoded = MainListReply.fromBinary(gRPC.decode(result.body));
  assert.equal(decoded.cm, undefined);
  assert.deepEqual(decoded.topReplies, []);
  assert.deepEqual(decoded.replies.map(reply => reply.content.message), ["正常评论"]);
});

test("published PGC script removes banners and keeps real episodes", async () => {
  const result = await runSurge("https://api.biliapi.net/pgc/page/bangumi", {
    status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ code: 0, result: { modules: [{
      style: "banner_v3", items: [{ link: "https://example.com/ad" }, { link: "https://www.bilibili.com/bangumi/play/ep1" }],
    }] } }),
  });
  assert.deepEqual(JSON.parse(result.body).result.modules[0].items, [{ link: "https://www.bilibili.com/bangumi/play/ep1" }]);
});

test("published player script removes only explicitly marked advertisement fragments", async () => {
  const payload = PlayViewUniteReply.toBinary(PlayViewUniteReply.create({ viewInfo: { promptBar: {} }, fragmentVideo: { videos: [
    { fragmentInfo: { fragmentType: FragmentType.AD_FRAGMENT } },
    { fragmentInfo: { fragmentType: FragmentType.OGV_FRAGMENT } },
  ] } }));
  const result = await runSurge("https://grpc.biliapi.net/bilibili.app.playerunite.v1.Player/PlayViewUnite", binary(gRPC.encode(payload)));
  const decoded = PlayViewUniteReply.fromBinary(gRPC.decode(result.body));
  assert.equal(decoded.viewInfo.promptBar, undefined);
  assert.deepEqual(decoded.fragmentVideo.videos.map(video => video.fragmentInfo.fragmentType), [FragmentType.OGV_FRAGMENT]);
});

test("published search script preserves video results while removing commercial and game cards", async () => {
  const payload = SearchAllResponse.toBinary(SearchAllResponse.create({ item: [
    { cardItem: { oneofKind: "av", av: {} } },
    { cardItem: { oneofKind: "cm", cm: {} } },
    { cardItem: { oneofKind: "game", game: {} } },
  ] }));
  const result = await runSurge("https://app.biliapi.net/bilibili.polymer.app.search.v1.Search/SearchAll", binary(gRPC.encode(payload)));
  assert.deepEqual(SearchAllResponse.fromBinary(gRPC.decode(result.body)).item.map(item => item.cardItem.oneofKind), ["av"]);
});

test("published TFInfo script keeps removing mobile-data commercial prompts", async () => {
  const payload = TFInfoReply.toBinary(TFInfoReply.create({ tipsId: "1", tfToast: {}, tfPanelCustomized: {}, userFlagNew: true }));
  const result = await runSurge("https://grpc.biliapi.net/bilibili.app.view.v1.View/TFInfo", binary(gRPC.encode(payload)));
  const decoded = TFInfoReply.fromBinary(gRPC.decode(result.body));
  assert.equal(decoded.tfToast, undefined);
  assert.equal(decoded.tfPanelCustomized, undefined);
  assert.equal(decoded.userFlagNew, true);
});

for (const status of [200, 503]) {
  test(`upstream errors are preserved without being rewritten as empty successful replies (HTTP ${status})`, async () => {
    const response = { status, headers: { "content-type": "application/grpc", "grpc-status": "14", "grpc-message": "unavailable" }, body: new Uint8Array() };
    const result = await runSurge("https://grpc.biliapi.net/bilibili.app.dynamic.v2.Dynamic/DynAll", response);
    assert.equal(result.status, status);
    assert.equal(result.headers["grpc-status"], "14");
    assert.equal(result.headers["grpc-message"], "unavailable");
    assert.deepEqual(Array.from(result.body), []);
  });
}

test("HTTP errors without gRPC status pass through unchanged", async () => {
  const response = { status: 503, headers: { "content-type": "application/json" }, body: '{"error":"unavailable"}' };
  const result = await runSurge("https://api.bilibili.com/x/vip/ads/materials?position=52", response);
  assert.equal(result.status, 503);
  assert.equal(result.body, response.body);
});

test("gRPC error header matching is case-insensitive", async () => {
  const result = await runSurge(`${service}PlayPause`, {
    status: 200, headers: { "Content-Type": "application/grpc", "Grpc-Status": "14" }, body: new Uint8Array(),
  });
  assert.equal(result.headers["Grpc-Status"], "14");
  assert.equal(result.headers["grpc-status"], undefined);
  assert.deepEqual(Array.from(result.body), []);
});

test("bodyBytes input cannot leave the original unfiltered binary body in output", async () => {
  const result = await runSurge(`${service}PlayPause`, binary(gRPC.encode(Uint8Array.from([8, 1]))), { bodyBytes: true });
  assert.deepEqual(Array.from(result.body), [0, 0, 0, 0, 0]);
  assert.equal(result.bodyBytes, undefined);
});

function webFrame(flag, bytes) {
  const header = Buffer.alloc(5);
  header[0] = flag;
  header.writeUInt32BE(bytes.length, 1);
  return Buffer.concat([header, bytes]);
}

test("gRPC-Web trailer errors pass through without being converted to successful replies", async () => {
  const body = Uint8Array.from(webFrame(0x80, Buffer.from("grpc-status:14\r\ngrpc-message:unavailable\r\n")));
  const result = await runSurge("https://grpc.biliapi.net/bilibili.app.dynamic.v2.Dynamic/DynAll", {
    status: 200, headers: { "content-type": "application/grpc-web" }, body,
  });
  assert.equal(result.headers["content-type"], "application/grpc-web");
  assert.equal(result.headers["grpc-status"], undefined);
  assert.deepEqual(Array.from(result.body), Array.from(body));
});

test("successful gRPC-Web responses are still filtered", async () => {
  const body = Uint8Array.from(Buffer.concat([
    webFrame(0, Buffer.from([8, 1])), webFrame(0x80, Buffer.from("grpc-status:0\r\n")),
  ]));
  const result = await runSurge(`${service}PlayPause`, {
    status: 200, headers: { "content-type": "application/grpc-web" }, body,
  });
  assert.deepEqual(Array.from(result.body), [0, 0, 0, 0, 0]);
  assert.equal(result.headers["grpc-status"], "0");
});

test("malformed protobuf fails open without modifying body or headers", async () => {
  const body = Uint8Array.from([0, 0, 0, 0, 1, 255]);
  const result = await runSurge(`${service}AIRelateAsync`, binary(body));
  assert.deepEqual(Array.from(result.body), Array.from(body));
  assert.equal(result.headers["grpc-status"], undefined);
});
