import assert from "node:assert/strict";
import test from "node:test";
import { runSurge } from "./surge-runtime.mjs";

for (const host of ["app.bilibili.com", "app.biliapi.net", "app.biliapi.com"]) {
  for (const path of ["/x/v2/feed/index/story", "/x/v2/feed/index/relate/story"]) {
    test(`published Story cleaner handles ads and commercial buttons on ${host}${path}`, async () => {
      const ordinary = { id: "normal", card_goto: "vertical_av", ad_info: { aid: "metadata" }, share_bottom_button: [
        { type: 20, button_metas: [{ text: "收藏", link: "https://www.bilibili.com/video/test" }] },
        { type: 1, button_metas: [{ text: "分享" }] },
      ] };
      const input = { code: 0, data: { cursor: "next", items: [
        ordinary,
        { id: "buttons", card_goto: "vertical_av", share_bottom_button: [
          { type: 20, button_metas: [{ text: "助TA必火" }] },
          { type: 20, button_metas: [{ link: "https://cm.bilibili.com/fly-h5?from=story" }] },
          { type: 20, button_metas: [{ link: "https://cm.bilibili.com.example.org/fly-h5" }] },
          { type: 20, button_metas: [{ link: "invalid" }] },
        ] },
        ...["vertical_ad_av", "vertical_ad_picture", "vertical_ad_live", "vertical_pgc"].map(card_goto => ({ card_goto })),
        { card_goto: "vertical_av", is_ad: true },
      ] } };
      const result = await runSurge(`https://${host}${path}?device=ipad`, { status: 200, body: JSON.stringify(input) });
      const output = JSON.parse(result.body);
      assert.equal(output.data.cursor, "next");
      assert.equal(output.data.items.length, 2);
      assert.deepEqual(output.data.items[0], ordinary);
      assert.deepEqual(output.data.items[1].share_bottom_button, input.data.items[1].share_bottom_button.slice(2));
    });
  }
}
