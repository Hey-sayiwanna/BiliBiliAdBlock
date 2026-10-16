import { rollup } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { fileURLToPath } from "node:url";
import { copyFile } from "node:fs/promises";

// 固定源码与依赖，构建可供 Surge 独立运行的脚本。
// Build standalone Surge scripts from the pinned source and dependencies.
const root = new URL("../", import.meta.url);
for (const [input, file] of [
  ["scripts/bilibili-response.mjs", "vendor/Biliverse.ADBlock.v0.7.3.ipad-fix-v1.4.1.response.bundle.js"],
  ["scripts/bilibili-default-words.mjs", "scripts/bilibili-default-words.v1.4.1.js"],
]) {
  const build = await rollup({
    input: fileURLToPath(new URL(input, root)),
    plugins: [nodeResolve(), commonjs(), terser()],
  });
  try {
    await build.write({
      file: fileURLToPath(new URL(file, root)),
      format: "es",
      banner: "/*! Biliverse/ADBlock v0.7.3 | Apache-2.0 | Local Surge entry adapter | See THIRD_PARTY_NOTICES.md */\nconsole.log('[Bilibili AdBlock] self-hosted 1.4.1 / iPad grpc-status fix');",
    });
  } finally {
    await build.close();
  }
}
await copyFile(new URL("scripts/bilibili-json.js", root), new URL("scripts/bilibili-json.v1.4.0.js", root));
