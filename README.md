# Kimi Tools MCP Server

<a href="https://github.com/qwibitai/nanoclaw/tree/main/repo-tokens"><img src="badge.svg" alt="Token count badge"></a>

<!-- token-count --><a href="https://github.com/qwibitai/nanoclaw/tree/main/repo-tokens">2.4k tokens · 1% of context window</a><!-- /token-count -->

MCP 服务器，借助 kimi-cli 的力量实现网络搜索和内容获取功能。

## config

```json
{
  "mcpServers": {
    "kimi-tools-mcp": {
      "command": "npx",
      "args": ["-y", "@lionad/kimi-tools-mcp"]
    }
  }
}
```

## tools

* **kimi-search**: 将 kimi 作为智能代理执行复杂的搜索和分析任务（是 `kimi -p "搜索网络: xxx"` 的一层包装）
