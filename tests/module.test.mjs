import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const moduleText = fs.readFileSync(new URL("../bilibiliADBLOCk", import.meta.url), "utf8");
const prefix = "https://raw.githubusercontent.com/Hey-sayiwanna/bilibiliAdBlock/main/";
const paths = [...moduleText.matchAll(/script-path=([^,\n]+)/g)].map(match => match[1]);

test("every runtime script uses this repository and exists locally", () => {
  assert.ok(paths.length > 0);
  for (const path of paths) {
    assert.ok(path.startsWith(prefix), path);
    assert.ok(fs.existsSync(new URL(`../${path.slice(prefix.length)}`, import.meta.url)), path);
  }
});

test("account and bottom navigation are outside every response rule", () => {
  const patterns = [...moduleText.matchAll(/pattern=([^,\n]+)/g)].map(match => new RegExp(match[1]));
  for (const path of ["/x/v2/account/mine", "/x/resource/show/tab/v2"]) {
    assert.ok(patterns.every(pattern => !pattern.test(`https://app.bilibili.com${path}`)));
  }
});

test("published local JSON artifact matches its maintained source", () => {
  assert.equal(fs.readFileSync(new URL("../scripts/bilibili-json.v1.5.1.js", import.meta.url), "utf8"),
    fs.readFileSync(new URL("../scripts/bilibili-json.js", import.meta.url), "utf8"));
});

test("binary response rules: video page capped at 512KB, all others unlimited", () => {
  for (const line of moduleText.split("\n").filter(line => line.includes("type=http-response") && line.includes("binary-body-mode=1"))) {
    assert.match(line, /requires-body=true/);
    if (line.startsWith("Bili.Player.AdPatch =")) {
      assert.match(line, /max-size=524288/);
    } else {
      assert.match(line, /max-size=-1/);
    }
  }
});

test("default search words are untouched while search advertising is still filtered", () => {
  assert.ok(moduleText.split("\n").every(line => line.startsWith("#") || !line.includes("Search/DefaultWords")));
  assert.ok(moduleText.includes("bilibili-search-result-ad ="));
  assert.ok(moduleText.includes("Search.AD=true"));
  assert.ok(moduleText.includes("search/square"));
});

test("every script gives up after 10 seconds instead of 60", () => {
  for (const line of moduleText.split("\n").filter(line => line.includes("script-path="))) {
    assert.match(line, /timeout=10(?:,|$)/, line);
  }
});
