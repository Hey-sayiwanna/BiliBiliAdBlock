import fs from "node:fs";
import vm from "node:vm";
import { gunzipSync } from "node:zlib";

const text = fs.readFileSync(new URL("../bilibiliADBLOCk", import.meta.url), "utf8");
const rules = text.split("\n").filter(line => /type=http-(?:request|response)/.test(line)).map(line => ({
  phase: line.match(/type=http-(request|response)/)[1],
  pattern: new RegExp(line.match(/pattern=([^,]+)/)[1]),
  path: line.match(/script-path=([^,]+)/)[1].split("/main/")[1],
  argument: line.match(/argument=(.*)/)?.[1] ?? "",
}));

export async function runSurge(url, response, { bodyBytes = false, persisted = null, requestHeaders = {}, phase = "response" } = {}) {
  const rule = rules.find(rule => rule.phase === phase && rule.pattern.test(url));
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
        $request: { method: "POST", url, headers: { "user-agent": "grpc-c++/1 bili-universal/90000000", "x-bili-moss-engine-type": "1", ...requestHeaders } },
        $response: input,
        $done: result => { clearTimeout(timer); resolve(Object.keys(result).length ? result : input); },
      }, { timeout: 2000 });
    } catch (error) { clearTimeout(timer); reject(error); }
  });
}

export async function runDefaultWords(url, requestHeaders = {}) {
  const line = text.split("\n").find(line => line.includes(" data-type=base64 ") && new RegExp(line.split(" ")[0]).test(url));
  if (line) {
    const headers = Object.fromEntries(line.match(/header="([^"]+)"/)[1].split("|").map(header => {
      const index = header.indexOf(":");
      return [header.slice(0, index).toLowerCase(), header.slice(index + 1)];
    }));
    return { status: Number(line.match(/status-code=(\d+)/)[1]), headers, body: Buffer.from(line.match(/data="([^"]+)"/)[1], "base64") };
  }
  const result = await runSurge(url, undefined, { requestHeaders, phase: "request" });
  return result?.response;
}
