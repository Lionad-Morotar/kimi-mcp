# Context — kimi-tools-mcp

本项目为术语表（glossary），记录领域语言，不含实现细节。

## 术语

**Kimi CLI**

月之暗面（Moonshot AI）提供的命令行 agent（`kimi`）。当前为 0.x 版本，flag 表面（flag surface）在不同版本间不稳定。本项目通过子进程调用它完成搜索、抓取、图片分析。

**MCP Tool**

本项目向 MCP 客户端（如 Claude Code）暴露的工具单元。当前有三个：`kimi-search`、`kimi-fetch`、`kimi-image`。对客户端而言是稳定的能力契约。

**Compat Layer（兼容层 / Adapter）**

隔离 Kimi CLI 版本变动的防腐层（Anti-Corruption Layer）。封装命令构造与输出解析，对上层 MCP Tool 暴露稳定接口 `runKimi(prompt, opts) → text`。Kimi CLI 再变 flag，只改本层。

**Flag Surface（flag 表面）**

某版本 Kimi CLI 支持的命令行参数集合。本项目已知两套：

- **Legacy Surface**：`-p <prompt> --print --output-format stream-json --final-message-only`（0.11.x 及更早）
- **Modern Surface**：`-p <prompt>`（默认 text 输出，0.12.x 起，`--print` / `--final-message-only` 已移除）

**Capability Detection（能力探测）**

通过解析 `kimi --help` 的文本特征，判定当前安装的 Kimi CLI 属于哪套 flag surface，而非依赖版本号映射。

**runKimi**

兼容层对外稳定接口：输入 prompt 与超时，输出纯文本结果。是三个 MCP Tool 唯一的 Kimi 调用入口。
