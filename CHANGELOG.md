# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.2] - 2026-06-25

### Fixed
- 修复 `npx` 启动时 MCP server 立即退出的问题：原 `process.argv[1].endsWith('index.js')` 判断在 npx shim（`.bin/main`）场景下失效，改为排除 vitest 即启动服务器
- `.gitignore` 补充 `zRefs` 排除，避免发布包包含调试目录

### Changed
- `McpServer` 硬编码版本号随 package.json 同步为 `0.4.2`

## [0.4.1] - 2026-06-25

### Added
- 新增 `kimi-video` 工具：分析本地视频内容，支持场景化指令并由 kimi 自行决定分析方式（抽帧、动作序列、关键事件等）
- `kimi-video` 单独设置 10 分钟超时，并在调用前校验文件存在、可读及 100MB 大小限制（对齐 Kimi CLI `ReadMediaFile` 能力边界）

### Changed
- `KIMI_TOOLS=all` 现在同时启用 `search`、`fetch`、`image`、`video`
- Vitest 配置排除 `zRefs/**`，避免调试目录中的第三方测试被误扫描

### Fixed
- [internal] 修正 `zRefs/video-samples/sample-small.mp4` 的嵌套目录结构，使其位于预期路径

## [0.4.0] - 2026-06-23

### Added
- 引入 Kimi CLI 兼容层（`src/cli/`）：`detector` 能力探测 + `adapter` 稳定接口 `runKimi` + 统一错误类型 `KimiCliError`
- 自动探测 kimi CLI 的 flag surface（legacy `--print`/`--final-message-only` vs modern `-p` 默认 text），三段式降级（能力探测 → 版本兜底 → modern 降级），详见 `docs/adr/0001`
- 新增 detector / adapter 单元测试，覆盖 legacy / modern / fallback 三路径与四类错误翻译

### Changed
- 代码按职责拆分：`src/cli/`（兼容层）、`src/tools/`（prompt 构造）、`src/schemas.ts`（输入校验）；`src/index.ts` 从 444 行瘦至约 280 行
- 三个 MCP 工具统一经由 `runKimi` 调用 kimi，CLI flag 变动只需改兼容层一处

### Fixed
- 适配 kimi CLI 0.12.x：移除已废弃的 `--print` 与 `--final-message-only`，改用 modern surface（`-p` 默认 text）
- 清洗 modern kimi -p 输出的包装噪音（开头 `• ` bullet 前缀、结尾 session 恢复尾注），保证工具返回干净内容

## [0.3.0] - 2026-04-27

### Added
- 新增 kimi-image 工具：分析图片内容，结合场景上下文提供专业分析
- 新增 Vitest E2E 测试套件，采用 LLM 语义评估验证 prompt 质量
- 新增 repo token count badge 工作流

### Changed
- **BREAKING**: 工具默认关闭，必须通过 `env.KIMI_TOOLS` 显式配置开启（如 `"search,fetch,image"` 或 `"all"`）
- 更新 README 配置说明，增加工具显式配置的详细文档
- token count badge 改为生成 SVG 图片格式

### Fixed
- repo-tokens GitHub Action 引用从 `@v1` 修复为 `@main`

## [0.2.0] - 2026-03-12

### Changed
- 包名从 `kimi-search` 重命名为 `@lionad/kimi-tools-mcp`
- 更新相关文档和代码引用

## [0.1.0] - 2026-03-12

### Added
- 新增 `kimi-fetch` 工具，支持更灵活的网页内容获取
- 添加 `prepublishOnly` 钩子，发布前自动构建

## [0.0.1] - 2026-03-12

### Added
- 初始版本：kimi-search MCP server
- 支持 kimi-search 搜索工具
