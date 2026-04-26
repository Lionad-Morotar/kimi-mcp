# E2E 测试提示

## 测试场景

本项目使用 Vitest 做 E2E 测试，验证三个 MCP 工具（kimi-search、kimi-fetch、kimi-image）能否正确构造 prompt 并调用 kimi CLI。

## 测试图片

`assets/test-image.jpg` — 用于 kimi-image 测试的示例图片，来自 picsum.photos。

## 测试策略

- Mock `execFileAsync` 捕获 kimi CLI 调用参数
- 使用 `runKimiEval`（LLM 评估）验证每个工具的 prompt 构造质量，而非字符匹配
- 验证 schema 输入校验（非法输入应被拒绝）
- 验证错误处理分支（ENOENT、ETIMEDOUT 等）

## 工具预期行为

### kimi-search
- 输入的 instruction 会被包装在 context header 中
- 调用 `kimi -p <instruction> --print --output-format stream-json --final-message-only`
- 超时 5 分钟，buffer 10MB

### kimi-fetch
- URL 会被嵌入到获取页面的 prompt 模板中
- 调用参数与 search 相同
- 超时 2 分钟

### kimi-image
- imagePath + scene + instruction 会被组合成场景化分析 prompt
- scene 在 prompt 中出现两次（开头和输出要求），确保 kimi 始终以场景视角分析
- 超时 5 分钟
