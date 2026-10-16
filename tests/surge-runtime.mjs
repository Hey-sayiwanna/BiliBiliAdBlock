import fs from "node:fs";
import vm from "node:vm";
import { gunzipSync } from "node:zlib";

const text = fs.readFileSync(new URL("../bilibiliADBLOCk", import.meta.url), "utf8");
const rules = text.split("\n").filter(line => line.includes("type=http-response")).map(line => ({
  pattern: new RegExp(line.match(/pattern=([^,]+)/)[1]),
  path: line.match(/script-path=([^,]+)/)[1].split("/main/")[1],
  argument: line.match(/argument=(.*)/)?.[1] ?? "",
}));

export async function runSurge(url, response, { bodyBytes = false, persisted = null } = {}) {
  const rule = rules.find(rule => rule.pattern.test(url));
  if (!rule) return response;
  const source = fs.readFileSync(new URL(`../${rule.path}`, import.meta.url), "utf8");
  const input = structuredClone(response);
  if (bodyBytes) { input.bodyBytes = input.body; delete input.body; }
  const logs = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Script did not finish: ${url}\n${logs.join("\n")}`)), 3000);
    const log = (...args) => logs.push(args.map(String).join(" "));
    try {
      vm.runInNewContext(source, {
        URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer,
        console: { log, error: log, warn: log, info: log, debug: log },
        $environment: { "surge-version": "test" },
        $utils: { ungzip: bytes => Uint8Array.from(gunzipSync(bytes)) },
        $script: { startTime: Date.now() / 1000 },
        $persistentStore: { read: () => persisted, write: () => true },
        $argument: rule.argument,
        $request: { method: "POST", url, headers: { "user-agent": "grpc-c++/1 bili-universal/90000000", "x-bili-moss-engine-type": "1" } },
        $response: input,
        $done: result => { clearTimeout(timer); resolve(Object.keys(result).length ? result : input); },
      }, { timeout: 2000 });
    } catch (error) { clearTimeout(timer); reject(error); }
  });
}
