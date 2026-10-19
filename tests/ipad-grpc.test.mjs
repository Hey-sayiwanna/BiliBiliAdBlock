import assert from "node:assert/strict";
import test from "node:test";
import gRPC from "@nsnanocat/grpc";
import { Console } from "@nsnanocat/util";
import { ViewReply, ViewProgressReply } from "@biliverse/protobuf/bilibili/app/view/v1/view.js";
import { MainListReply } from "@biliverse/protobuf/bilibili/main/community/reply/v1/reply.js";
import { SubjectDescriptionReply } from "@biliverse/protobuf/bilibili/main/community/reply/v2/reply.js";
import { runDefaultWords, runSurge } from "./surge-runtime.mjs";

Console.logLevel = "OFF";
const ipad = "bili-hd2/37501100 os/ios model/iPad mobi_app/ipad osVer/17.4";
const header = (response, name) => Object.entries(response.headers).find(([key]) => key.toLowerCase() === name)?.[1];

// 仅重建抓包中的结构和条数，不包含用户原始评论或账户数据。
// Recreate only capture shapes and counts, without original comments or account data.
for (const agent of [ipad, `grpc-c++/1.66.2 ${ipad}`]) {
  for (const [path, type, value, verify] of [
    ["bilibili.main.community.reply.v1.Reply/MainList", MainListReply, {
      replies: Array.from({ length: 19 }, (_, i) => ({ content: { message: `normal ${i}` } })),
      topReplies: [{ content: { message: "normal pinned" } }], cm: {},
    }, decoded => { assert.equal(decoded.replies.length, 19); assert.equal(decoded.topReplies.length, 1); assert.equal(decoded.cm, undefined); }],
    ["bilibili.main.community.reply.v2.Reply/SubjectDescription", SubjectDescriptionReply, {}, () => {}],
    ["bilibili.app.view.v1.View/View", ViewReply, {
      relates: [...Array.from({ length: 40 }, () => ({ goto: "av", title: "normal" })), { goto: "cm" }],
    }, decoded => { assert.equal(decoded.relates.length, 40); assert.ok(decoded.relates.every(item => item.goto === "av")); }],
    ["bilibili.app.view.v1.View/ViewProgress", ViewProgressReply, { videoGuide: {} }, decoded => assert.equal(decoded.videoGuide, undefined)],
  ]) {
    test(`iPad completes ${path} and preserves normal content (${agent.startsWith("grpc") ? "grpc" : "native"} UA)`, async () => {
      const payload = type.toBinary(type.create(value));
      const result = await runSurge(`https://grpc.biliapi.net/${path}`, {
        status: 200, headers: { "content-type": "application/grpc", "grpc-encoding": "gzip" }, body: gRPC.encode(payload),
      }, { requestHeaders: { "user-agent": agent, "x-bili-moss-engine-type": "1" } });
      assert.equal(header(result, "grpc-status"), "0");
      verify(type.fromBinary(gRPC.decode(result.body)));
    });
  }
}

for (const host of ["grpc.biliapi.net", "app.bilibili.com", "app.biliapi.net", "app.biliapi.com"]) {
  test(`iPad DefaultWords mock contains an explicit successful completion status on ${host}`, async () => {
    const result = await runDefaultWords(`https://${host}/bilibili.app.interface.v1.Search/DefaultWords`, {
      "user-agent": ipad, "x-bili-moss-engine-type": "1",
    });
    assert.equal(result.status, 200);
    assert.equal(header(result, "grpc-status"), "0");
    assert.equal(header(result, "content-type"), "application/grpc");
    assert.deepEqual(Array.from(result.body), [0, 0, 0, 0, 0]);
  });
}

for (const [agent, expected] of [["bili-universal/1", "0"], ["bili-blue/1", "0"], ["bili-inter/1", undefined]]) {
  test(`existing ${agent} response behavior is preserved`, async () => {
    const result = await runSurge("https://grpc.biliapi.net/bilibili.app.viewunite.v1.View/PlayPause", {
      status: 200, headers: { "content-type": "application/grpc" }, body: gRPC.encode(new Uint8Array()),
    }, { requestHeaders: { "user-agent": agent } });
    assert.equal(header(result, "grpc-status"), expected);
    const mocked = await runDefaultWords("https://app.bilibili.com/bilibili.app.interface.v1.Search/DefaultWords", { "user-agent": agent });
    assert.equal(header(mocked, "grpc-status"), "0");
    assert.deepEqual(Array.from(mocked.body), [0, 0, 0, 0, 0]);
  });
}

for (const agent of ["bili-overseas/1", "grpc-c++/1 bili-overseas/1", "bili-hd/1"]) {
  test(`${agent} completes Moss responses without removing recommendations`, async () => {
    const payload = ViewReply.toBinary(ViewReply.create({ relates: [{ goto: "av", title: "keep" }, { goto: "cm" }] }));
    const result = await runSurge("https://app.bilibili.com/bilibili.app.view.v1.View/View", {
      status: 200, headers: { "content-type": "application/grpc" }, body: gRPC.encode(payload),
    }, { requestHeaders: { "user-agent": agent } });
    assert.equal(header(result, "grpc-status"), "0");
    assert.deepEqual(ViewReply.fromBinary(gRPC.decode(result.body)).relates.map(item => item.title), ["keep"]);
  });
}

test("iPad real gRPC errors remain failures", async () => {
  const body = new Uint8Array();
  const result = await runSurge("https://grpc.biliapi.net/bilibili.main.community.reply.v1.Reply/MainList", {
    status: 200, headers: { "content-type": "application/grpc", "grpc-status": "14" }, body,
  }, { requestHeaders: { "user-agent": ipad } });
  assert.equal(header(result, "grpc-status"), "14");
  assert.deepEqual(Array.from(result.body), []);
});

test("iPad header names are case-insensitive", async () => {
  const result = await runSurge("https://app.bilibili.com/bilibili.app.view.v1.View/ViewProgress", {
    status: 200, headers: { "Content-Type": "application/grpc" }, body: gRPC.encode(new Uint8Array()),
  }, { requestHeaders: { "User-Agent": ipad, "X-Bili-Moss-Engine-Type": "1" } });
  assert.equal(header(result, "grpc-status"), "0");
});

test("iPad response without the Moss marker keeps the previous behavior", async () => {
  const result = await runSurge("https://app.bilibili.com/bilibili.app.view.v1.View/ViewProgress", {
    status: 200, headers: { "content-type": "application/grpc" }, body: gRPC.encode(new Uint8Array()),
  }, { requestHeaders: { "user-agent": ipad, "x-bili-moss-engine-type": "0" } });
  assert.equal(header(result, "grpc-status"), undefined);
});
