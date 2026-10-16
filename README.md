# B站去广告（自托管增强版 1.4.0）

适用于 Surge 的 B站去广告模块。运行文件全部使用本仓库地址，减少外部脚本失效带来的影响。

## 订阅地址

https://raw.githubusercontent.com/Hey-sayiwanna/bilibiliAdBlock/main/bilibiliADBLOCk

## 功能

- 开屏广告与预加载、首页信息流、搜索推荐和搜索结果去广告
- 短视频流及关联短视频流广告、商业分享按钮清理
- 直播信息流、直播间推荐和直播 Tab 广告清理
- 新旧视频简介区商业卡、关联推广、异步补发广告和活动横幅清理
- 暂停、播放结束页广告及新版播放器中明确标识的广告片段清理
- 动态综合页、视频页和个人动态流中的广告卡清理
- 番剧电影推荐页广告、活动弹窗和播放器推广提示清理
- 评论区商业卡、置顶带货推广和编辑器商业入口清理
- “流量告急”和办卡免流提示清理
- 保留底部完整导航，不删除或移动“会员购”

## 安装

1. 删除旧的 B站去广告模块，避免重复脚本互相影响。
2. 使用上面的订阅地址导入 Surge。
3. 开启模块、脚本、HTTP 重写和 MitM，并安装信任 Surge 证书。
4. 完全退出 B站 App 后重新打开。

## 从旧版更新

1. 在 Surge 更新此模块，确认模块版本为 **1.4.0**。
2. 更新模块引用的脚本，等待两个自托管脚本下载完成。
3. 完全退出 B站 App 后重新打开。

订阅地址保持不变，新脚本使用带版本的文件名，避免沿用旧脚本缓存。不要同时启用其他处理相同 B站接口的去广告模块。

## 实现方式

JSON 接口由本地脚本清理广告卡片，Protobuf/gRPC 接口使用从 [Biliverse/ADBlock v0.7.3](https://github.com/Biliverse/ADBlock/tree/v0.7.3) 源码构建的处理脚本，解码后移除广告字段再重新编码。源码快照、构建依赖和产物均保存在本仓库。

1.4.0 补齐旧版未接入的短视频、动态和新版播放器接口，识别 `ad_inline` 横幅，并避免仅因普通视频含 `ad_info` 就删除内容。模块不再整域拒绝正常 API 主机，匹配规则与 MitM 主机同步覆盖备用接口。评论清理针对结构化商业卡和置顶商业推广，普通评论文本保持原样。

## 使用说明

- 首次更新脚本可能受 GitHub 网络速度影响，加载完成后 Surge 会使用缓存。
- 本项目不修改“我的”页面，也不精简底部导航。
- 保留普通竖屏视频、非广告活动横幅和动态“最常访问”。
- 本模块的广告选项优先于旧 BoxJS 设置，避免残留配置关闭过滤。
- 无法识别并剪除视频画面中已录入的口播或植入广告。
- B站接口变化后，个别新广告形式可能需要继续补充。

## 构建与验证

使用 Node.js 24 或更高版本，在仓库根目录运行：

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run test:upstream
```

构建通过本地入口 `scripts/bilibili-response.mjs` 引用固定的 `upstream/Biliverse-ADBlock-v0.7.3/src/process/Response.mjs`，生成 `vendor/Biliverse.ADBlock.v0.7.3.response.bundle.js`，同时生成带版本的本地 JSON 脚本。本地入口保留原始 HTTP/gRPC 错误响应，并避免同时返回新旧二进制响应体。维护本地 JSON 逻辑时修改 `scripts/bilibili-json.js`，再重新构建。

本仓库测试执行实际发布脚本，检查规则命中、正常内容保留、压缩 gRPC 和未知字段保留。`test:upstream` 运行参考源码中与业务处理相关的四组回归测试，不包含本模块未接入的设置面板构建测试。

## 开源说明

感谢 [Biliverse/ADBlock](https://github.com/Biliverse/ADBlock) 及其贡献者提供的基础实现。来源、许可证和本地修改见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
