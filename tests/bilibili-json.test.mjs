import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const script = fs.readFileSync(new URL("../scripts/bilibili-json.js", import.meta.url), "utf8");

function run(path, response) {
  let result;
  vm.runInNewContext(script, {
    URL,
    console,
    $request: { url: `https://app.bilibili.com${path}` },
    $response: { body: JSON.stringify(response) },
    $done: (value) => {
      result = value;
    },
  });
  return JSON.parse(result.body);
}

test("feed removes ads but keeps videos and normal banners", () => {
  const output = run("/x/v2/feed/index?device=phone", {
    data: {
      items: [
        { card_type: "small_cover_v2", card_goto: "av", id: "video" },
        { card_type: "cm_v2", card_goto: "ad_web_s", id: "ad" },
        {
          card_type: "banner_v8",
          card_goto: "banner",
          banner_item: [{ type: "ad", id: "banner-ad" }, { type: "activity", id: "keep" }],
        },
      ],
    },
  });
  assert.deepEqual(output.data.items.map((item) => item.id), ["video", undefined]);
  assert.deepEqual(output.data.items[1].banner_item.map((item) => item.id), ["keep"]);
});

test("search removes trending and preserves other entries", () => {
  const output = run("/x/v2/search/square", { data: [{ type: "trending" }, { type: "history", id: 1 }] });
  assert.deepEqual(output.data, [{ type: "history", id: 1 }]);
});

test("live tab removes banners and explicit ads only", () => {
  const output = run("/xlive/app-interface/v2/second/getList", {
    data: {
      banner_list: [{ id: "banner" }],
      list: [{ roomid: 1 }, { roomid: 2, is_ad: 1 }],
    },
  });
  assert.deepEqual(output.data.banner_list, []);
  assert.deepEqual(output.data.list, [{ roomid: 1 }]);
});

test("live room removes shopping ad without touching unrelated fields", () => {
  const output = run("/xlive/app-room/v1/index/getInfoByRoom", {
    data: { activity_banner_info: { id: 1 }, shopping_info: { is_show: 1 }, title: "keep" },
  });
  assert.equal(output.data.activity_banner_info, undefined);
  assert.deepEqual(output.data.shopping_info, { is_show: 0 });
  assert.equal(output.data.title, "keep");
});

test("account mine response stays byte-for-byte equivalent", () => {
  const input = { data: { sections_v2: [{ title: "会员购" }], tab: ["首页", "会员购", "我的"] } };
  const output = run("/x/v2/account/mine", input);
  assert.deepEqual(output, input);
});

test("feed keeps ordinary videos carrying ad_info metadata", () => {
  const video = { id: "video", card_type: "small_cover_v2", card_goto: "av", ad_info: {} };
  assert.deepEqual(run("/x/v2/feed/index", { data: { items: [video] } }).data.items, [video]);
});

test("feed removes inline banner ads and keeps activity banners", () => {
  const output = run("/x/v2/feed/index", { data: { items: [{
    card_type: "banner_ipad_v8", banner_item: [{ type: "ad_inline" }, { type: "activity" }],
  }] } });
  assert.deepEqual(output.data.items[0].banner_item, [{ type: "activity" }]);
});

for (const path of ["/x/v2/feed/index/story", "/x/v2/feed/index/relate/story"]) {
  test(`${path} removes commercial cards and keeps ordinary vertical videos`, () => {
    const output = run(path, { data: { items: [
      { id: "video", card_goto: "vertical_av", share_bottom_button: [
        { type: 20, button_metas: [{ text: "助TA必火", link: "https://cm.bilibili.com/fly-h5" }] },
        { type: 1, button_metas: [{ text: "分享" }] },
      ] },
      ...["vertical_ad_av", "vertical_ad_picture", "vertical_ad_live", "vertical_pgc"].map(card_goto => ({ card_goto })),
    ] } });
    assert.deepEqual(output.data.items, [{ id: "video", card_goto: "vertical_av", share_bottom_button: [
      { type: 1, button_metas: [{ text: "分享" }] },
    ] }]);
  });
}

test("live feed removes nested advertising cards and keeps real live rooms", () => {
  const normal = { card_data: { small_card_v1: { roomid: 1, is_ad: 0, ad_transparent_content: "" } } };
  const output = run("/xlive/app-interface/v2/index/feed", { data: { card_list: [
    normal,
    { card_data: { small_card_v1: { roomid: 2, show_ad_icon: "1" } } },
    { card_data: { small_card_v1: { roomid: 3, ad_transparent_content: "commercial" } } },
  ] } });
  assert.deepEqual(output.data.card_list, [normal]);
});

test("live recommendations remove explicit ads without discarding normal rooms", () => {
  assert.deepEqual(run("/xlive/app-interface/v2/room/recList", { data: {
    list: [{ roomid: 1 }, { roomid: 2, is_ad: "1" }],
  } }).data.list, [{ roomid: 1 }]);
});

for (const path of ["/x/v2/splash/list", "/x/v2/splash/brand/list", "/x/v2/splash/event/list2"]) {
  test(`${path} clears preloaded splash ads while preserving unrelated settings`, () => {
    const output = run(path, { code: 0, data: {
      show: [{ id: 1 }], event_list: [{ id: 2 }], preload: [{ id: 3 }], account: { id: 4 }, keep: true,
    } });
    assert.deepEqual(output, { code: 0, data: { keep: true } });
  });
}
