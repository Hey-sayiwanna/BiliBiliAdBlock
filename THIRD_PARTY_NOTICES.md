# Third-party notices

## Biliverse/ADBlock v0.7.3 (active runtime)

- Source: https://github.com/Biliverse/ADBlock/tree/v0.7.3
- Source commit: `bf9f66250fe97383847ffabfcb6183fed752e181`
- Source archive SHA-256: `f9755c2be14b57462f3bf7fa3c69c59175df790af89f199d5410d22a8edbb1cc`
- License: Apache License 2.0, included in `upstream/Biliverse-ADBlock-v0.7.3/LICENSE`.
- Unmodified source snapshot: `upstream/Biliverse-ADBlock-v0.7.3`.
- Locally built active artifact: `vendor/Biliverse.ADBlock.v0.7.3.ipad-fix-v1.4.1.response.bundle.js`. The original 1.4.0 build remains available as a historical artifact.
- Build recipe: `scripts/build-vendor.mjs`; dependency versions are pinned in the root `package-lock.json`.

The upstream source snapshot is unchanged. The build replaces the upstream entrypoint with `scripts/bilibili-response.mjs`, which preserves upstream HTTP/gRPC failures, returns the original response on exceptions and removes stale `bodyBytes` when returning a rewritten `body`. `scripts/fix-grpc-headers.mjs` extends the existing upstream client rules for iPad Moss requests: missing completion status is added only after successful processing. `scripts/bilibili-default-words.mjs` replaces the static DefaultWords mock with a client-aware response, retaining the international client exception. It also uses a local, deterministic version banner and omits the unused upstream configuration-page artifact. The Surge module selects advertising routes and explicit settings; it does not install the upstream settings UI, account/navigation rewrites, teenager-mode handler, or danmaku features.

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
