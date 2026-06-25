import { z } from "zod";

// Zod 模式用于输入验证
export const AgentInstructionSchema = z.object({
  instruction: z.string()
    .min(1, "指令不能为空")
    .max(5000, "指令不能超过 5000 个字符")
    .describe(`完整的任务指令，描述需要 kimi-search 执行的搜索或分析任务。

指令应包含：
1. 搜索关键词或搜索主题
2. 具体目标（要获取什么信息）
3. 执行步骤（如何获取和处理信息）
4. 输出格式要求

示例指令：
---
搜索："bun package manager vs pnpm benchmark 2025"

目标：了解 Bun 作为新兴 JavaScript 包管理器与 pnpm 的对比，包括性能基准测试和功能差异

使用 WebSearch 工具执行网络搜索。
对于每个相关结果：
1. 使用 WebFetch 或浏览器工具获取页面内容
2. 提取与搜索目标相关的关键发现
3. 记录：URL、标题、要点、相关度评分（1-5）

以以下格式返回结构化结果：
\`\`\`
## {query}

### 结果 1：{title}
- URL: {url}
- 相关度：{1-5}/5
- 关键发现：
  - {要点}
- 引用：
  - "{相关摘录}"
\`\`\`

关注事实信息和有数据支持的论断。
---`)
}).strict();

// kimi-fetch 输入模式
export const FetchUrlSchema = z.object({
  url: z.string()
    .min(1, "URL 不能为空")
    .describe("要获取内容的网页 URL 地址")
}).strict();

// kimi-image 输入模式
export const ImageAnalysisSchema = z.object({
  imagePath: z.string()
    .min(1, "图片路径不能为空")
    .describe("要分析的图片文件的绝对路径"),
  scene: z.string()
    .min(1, "场景描述不能为空")
    .describe("图片使用的场景上下文，如 'web 站点开发'、'UI 设计审查'、'代码截图分析' 等。明确的场景描述能让分析更有针对性。"),
  instruction: z.string()
    .optional()
    .describe("额外的分析指令，如 '重点关注布局问题'、'提取所有文字内容' 等")
}).strict();

// kimi-video 输入模式
export const VideoAnalysisSchema = z.object({
  videoPath: z.string()
    .min(1, "视频路径不能为空")
    .describe("要分析的视频文件的绝对路径"),
  scene: z.string()
    .min(1, "场景描述不能为空")
    .describe("视频使用的场景上下文，如 '产品演示审查'、'UI 动效评估'、'教学视频分析' 等。明确的场景描述能让分析更有针对性。"),
  instruction: z.string()
    .optional()
    .describe("额外的分析指令，如 '重点关注转场节奏'、'提取关键动作顺序' 等")
}).strict();

export type AgentInstruction = z.infer<typeof AgentInstructionSchema>;
export type FetchUrlInput = z.infer<typeof FetchUrlSchema>;
export type ImageAnalysisInput = z.infer<typeof ImageAnalysisSchema>;
export type VideoAnalysisInput = z.infer<typeof VideoAnalysisSchema>;
