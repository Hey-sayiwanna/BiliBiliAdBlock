import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const text = fs.readFileSync(new URL("../bilibiliADBLOCk", import.meta.url), "utf8");
const rules = text.split("\n").filter(line => line.includes("pattern=")).map(line => ({
  line, pattern: new RegExp(line.match(/pattern=([^,]+)/)[1]),
}));
const mitm = text.match(/^hostname\s*=\s*%APPEND%\s*(.+)$/m)[1].split(",").map(s => s.trim());
const paths = [
  ["app.bilibili.com", "/x/v2/feed/index/story"],
  ["app.biliapi.net", "/x/v2/feed/index/relate/story"],
  ["app.biliapi.com", "/x/v2/feed/index"],
  ["api.bilibili.com", "/pgc/page/bangumi"],
  ["api.biliapi.net", "/pgc/page/cinema/tab"],
  ["api.bilibili.com", "/x/vip/ads/materials"],
  ["api.live.bilibili.com", "/xlive/app-interface/v2/room/recList"],
  ...[
    "bilibili.app.view.v1.View/PlayerRelates",
    "bilibili.app.view.v1.View/ViewProgress",
    "bilibili.app.viewunite.v1.View/AIRelateAsync",
    "bilibili.app.viewunite.v1.View/PlayPause",
    "bilibili.app.viewunite.v1.View/ViewEndPage",
    "bilibili.app.viewunite.v1.View/ViewProgress",
    "bilibili.app.playerunite.v1.Player/PlayViewUnite",
    "bilibili.app.dynamic.v2.Dynamic/DynAll",
    "bilibili.app.dynamic.v2.Dynamic/DynVideoPersonal",
    "bilibili.main.community.reply.v1.Reply/MainList",
    "bilibili.main.community.reply.v1.Reply/DetailList",
    "bilibili.main.community.reply.v2.Reply/SubjectDescription",
    "bilibili.pgc.gateway.player.v2.PlayURL/PlayView",
  ].map(path => ["grpc.biliapi.net", `/${path}`]),
];

for (const [host, path] of paths) {
  test(`exactly one response cleaner covers ${host}${path}`, () => {
    const matching = rules.filter(rule => rule.line.includes("type=http-response") && rule.pattern.test(`https://${host}${path}?test=1`));
    assert.equal(matching.length, 1);
    assert.ok(mitm.includes(host), `Missing MITM hostname: ${host}`);
    assert.ok(!text.includes(`DOMAIN,${host},REJECT`), `API hostname must remain reachable: ${host}`);
    if (path.startsWith("/bilibili.")) assert.match(matching[0].line, /binary-body-mode=1/);
  });
}

test("account, navigation, normal playback and unrelated domains are outside the rewrite scope", () => {
  for (const url of [
    "https://app.bilibili.com/x/v2/account/mine",
    "https://app.bilibili.com/x/resource/show/tab/v2",
    "https://api.bilibili.com/x/player/wbi/playurl?avid=1",
    "https://grpc.biliapi.net/bilibili.app.viewunite.v1.View/ViewOther",
    "https://example.com/bilibili.app.viewunite.v1.View/PlayPause",
  ]) assert.equal(rules.filter(rule => rule.pattern.test(url)).length, 0, url);
});
