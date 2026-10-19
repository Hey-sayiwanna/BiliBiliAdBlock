# Third-party notices

本项目从上游抽出去广告功能、精简 Surge 模块配置并进行针对性适配。感谢薯薯、Biliverse/ADBlock 及所有开源贡献者；核心去广告实现归功于上游项目。

## Biliverse/ADBlock v0.7.5 (active runtime)

- Source: https://github.com/Biliverse/ADBlock/tree/v0.7.5
- Source commit: `b0051916843f269d4b377aaf177f0d9e7b12e393`
- Source archive SHA-256: `5de8c0c2435aeef9eb333b05e6fb6704763e201edf962b4839b897ee86cca911`
- License: Apache License 2.0, included in `upstream/Biliverse-ADBlock-v0.7.5/LICENSE`.
- Unmodified source snapshot: `upstream/Biliverse-ADBlock-v0.7.5`.
- Locally built active artifact: `vendor/Biliverse.ADBlock.v0.7.5.v1.4.2.response.bundle.js`. The v0.7.3 source snapshot and 1.4.0/1.4.1 runtime artifacts remain available for historical module references.
- Build recipe: `scripts/build-vendor.mjs`; dependency versions are pinned in the root `package-lock.json`.

The upstream source snapshot is unchanged. The build replaces the upstream entrypoint with `scripts/bilibili-response.mjs`, which preserves upstream HTTP/gRPC failures, returns the original response on exceptions and removes stale `bodyBytes` when returning a rewritten `body`. `scripts/fix-grpc-headers.mjs` normalizes header names and extends the upstream client rules for legacy iPad Moss requests: missing completion status is added only after successful processing. DefaultWords now follows the upstream v0.7.5 native Surge mock: a five-byte empty gRPC message with HTTP 200 and grpc-status: 0 for all clients. The 1.4.1 request adapter and its built script are retained only as historical files and are not used or rebuilt by the current module. The response build uses a local, deterministic version banner and omits the unused upstream configuration-page artifact. The Surge module selects advertising routes and explicit settings; it does not install the upstream settings UI, account/navigation rewrites, teenager-mode handler, or danmaku features.

`scripts/bilibili-json.js` is a local adaptation of the feed, splash, story and live-room handling. It keeps the existing local feed/live behavior, adds the missing commercial markers and story routes, and avoids treating `ad_info` alone as proof of an advertisement. `scripts/bilibili-json.v1.4.0.js` is its generated runtime copy.

The bundle also incorporates the following runtime dependencies, under their original licenses:

- `@biliverse/protobuf` 1.1.0: https://github.com/Biliverse/protobuf (Apache-2.0).
- `@nsnanocat/util` 2.7.6: https://github.com/NSNanoCat/util (Apache-2.0).
- `@nsnanocat/grpc` 1.1.0: https://github.com/NSNanoCat/gRPC (Apache-2.0).
- `@protobuf-ts/runtime` and `@protobuf-ts/runtime-rpc`: https://github.com/timostamm/protobuf-ts (Apache-2.0).
- `pako` 2.2.0: https://github.com/nodeca/pako (MIT and zlib; copies in `licenses/pako-MIT.txt` and `licenses/pako-Zlib.txt`).

Local license copies are included in `licenses/`. The build resolves public npm packages; the public `@nsnanocat/grpc` 1.1.0 tarball has the same integrity hash as the upstream lockfile's GitHub Packages artifact. No package registry token is required for this project's root build.

## BiliUniverse/ADBlock

This project retains the historical, unmodified release artifacts and source snapshot from BiliUniverse/ADBlock v0.6.24. These artifacts are no longer referenced by the active module.

- Source: https://github.com/BiliUniverse/ADBlock
- License: Apache License 2.0
- Local license copy: `licenses/BiliUniverse-ADBlock-Apache-2.0.txt`
- Vendored files:
  - `vendor/BiliUniverse.ADBlock.v0.6.24.request.bundle.js`
  - `vendor/BiliUniverse.ADBlock.v0.6.24.response.bundle.js`
- Source snapshot: `upstream/BiliUniverse-ADBlock-v0.6.24`

The JSON cleaner in `scripts/bilibili-json.js` is a smaller local adaptation. It intentionally omits account-page processing so the bottom navigation, including 会员购, is preserved.
