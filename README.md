# Kimi Tools MCP Server

<a href="https://github.com/qwibitai/nanoclaw/tree/main/repo-tokens"><img src="badge.svg" alt="Token count badge"></a>

<!-- token-count --><a href="https://github.com/nanocoai/nanoclaw/tree/main/repo-tokens">6.3k tokens · 3% of context window</a><!-- /token-count -->

Kimi MCP 服务器，借助 kimi-cli 的力量实现网络搜索、内容获取和图片分析功能。

> tips: 当前项目是 Kimi CLI 的 MCP 薄封装，对于复杂需求也许你需要 [`Kimi Agent SDK`](https://github.com/MoonshotAI/kimi-agent-sdk/)

## config

```json
{
  "mcpServers": {
    "kimi-tools": {
      "command": "npx",
      "args": ["-y", "@lionad/kimi-tools-mcp"],
      "env": {
        "KIMI_TOOLS": "search,fetch,image"
      }
    }
  }
}
```

**默认不启用任何工具**，必须通过 `env.KIMI_TOOLS` 显式配置要开启的功能：

| 值 | 说明 |
|---|---|
| `search` | 启用 kimi-search 工具 |
| `fetch` | 启用 kimi-fetch 工具 |
| `image` | 启用 kimi-image 工具 |
| `all` | 启用全部工具 |
| 逗号分隔 | 如 `"search,fetch"` 同时启用搜索和获取 |
| 未设置 / 空 | **不注册任何工具** |

## tools

* **kimi-search**: 将 kimi 作为智能代理执行复杂的搜索和分析任务（是 `kimi -p "搜索网络: xxx"` 的一层包装）
* **kimi-fetch**: 从指定 URL 获取网页内容，并以结构化的 markdown 格式返回
* **kimi-image**: 分析图片内容，结合场景上下文提供有针对性的专业分析

## compatibility

本项目内置 Kimi CLI 兼容层（`src/cli/`），自动适配不同版本的 kimi CLI flag，无需手动配置版本：

- 启动时探测当前 kimi CLI 属于哪套 flag surface（modern：`-p` 默认 text；legacy：`-p --print --output-format stream-json --final-message-only`）
- 探测三段式降级：能力探测（`kimi --help` 文本特征）→ 版本兜底（`kimi --version`）→ modern 降级并告警
- 三个工具统一经由 `runKimi` 调用，kimi CLI 升级改 flag 时只需改兼容层一处

详见 `docs/adr/0001-capability-detection-over-version-mapping.md`。
