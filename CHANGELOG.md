# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
