#!/usr/bin/env node
/**
 * kimi-tools-mcp MCP Server
 *
 * 此服务器将 kimi 作为智能代理(agent)暴露给 MCP 客户端，
 * 支持执行复杂的搜索、内容获取和信息整合任务。
 *
 * 兼容层（src/cli/）隔离 kimi CLI 的版本变动；三个工具统一通过 runKimi 调用。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  AgentInstructionSchema,
  FetchUrlSchema,
  ImageAnalysisSchema,
  VideoAnalysisSchema,
  type AgentInstruction,
  type FetchUrlInput,
  type ImageAnalysisInput,
  type VideoAnalysisInput,
} from "./schemas.js";
import { executeKimiAgent } from "./tools/search.js";
import { executeKimiFetch } from "./tools/fetch.js";
import { executeKimiImage } from "./tools/image.js";
import { executeKimiVideo } from "./tools/video.js";
import { isVersionIncompatible } from "./cli/errors.js";

// 兼容层 re-export：保持既有测试从 ../src/index 导入的路径不变
export { executor } from "./cli/executor.js";
export {
  AgentInstructionSchema,
  FetchUrlSchema,
  ImageAnalysisSchema,
  VideoAnalysisSchema,
} from "./schemas.js";
export { executeKimiAgent } from "./tools/search.js";
export { executeKimiFetch } from "./tools/fetch.js";
export { executeKimiImage } from "./tools/image.js";
export { executeKimiVideo } from "./tools/video.js";

/**
 * 解析工具配置。
 *
 * 从环境变量 KIMI_TOOLS 读取要启用的工具列表。
 * - 未设置或为空：不启用任何工具
 * - "all"：启用全部工具
 * - 逗号分隔：启用指定的工具
 */
export function parseToolConfig(): string[] {
  const envValue = process.env.KIMI_TOOLS?.trim();
  if (!envValue) return [];
  if (envValue === 'all') return ['search', 'fetch', 'image', 'video'];
  return envValue.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * 统一的工具错误处理：按 code 诊断 + 翻译为 MCP content。
 * INCOMPATIBLE 时提示版本排查（KimiCliError.code 的生产消费点，见 QA Bug-3）。
 */
function handleToolError(error: unknown, label: string) {
  if (isVersionIncompatible(error)) {
    console.warn('[kimi-tools-mcp] 检测到 kimi CLI 版本不兼容，请检查 kimi --version 与 --help');
  }
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `${label}: ${errorMessage}` }],
  };
}

// 创建 MCP 服务器实例
const server = new McpServer({
  name: "kimi-tools-mcp",
  version: "0.4.0"
});

const enabledTools = parseToolConfig();

// 注册 kimi-search 工具
if (enabledTools.includes('search')) {
server.registerTool(
  "kimi-search",
  {
    title: "kimi-search",
    description: `将 kimi 作为智能代理(agent)执行复杂的搜索和分析任务。

与简单的搜索工具不同，kimi-search 可以：
- 进行多步骤的网络搜索
- 分析和比较多个信息源
- 生成结构化的报告和总结
- 执行需要推理的复杂查询

参数：
  - instruction (string): 完整的任务指令，包含搜索关键词、目标、执行步骤和输出格式要求

返回值：
  kimi-search 完成任务的完整输出，通常包含搜索结果、分析或总结。

使用场景对比：
  ❌ 不适合：简单的关键词查询（如 "React"）
  ✅ 适合：结构化的任务指令（包含目标、步骤、格式要求）

示例指令结构：
---
搜索："bun package manager vs pnpm benchmark 2025"

目标：了解 Bun 作为新兴 JavaScript 包管理器与 pnpm 的对比

执行步骤：
1. 使用 WebSearch 工具执行网络搜索
2. 对于每个相关结果，获取页面内容
3. 提取关键发现，记录 URL、标题、要点、相关度评分

输出格式：
## {query}
### 结果 1：{title}
- URL: {url}
- 相关度：{1-5}/5
- 关键发现：...
---

注意事项：
  - 需要安装 kimi CLI 工具
  - 复杂任务可能需要较长时间（最长 5 分钟）
  - 指令越详细，结果质量越高`,
    inputSchema: AgentInstructionSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: AgentInstruction) => {
    try {
      const result = await executeKimiAgent(params.instruction);

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error) {
      return handleToolError(error, '任务执行出错');
    }
  }
);
}

// 注册 kimi-fetch 工具
if (enabledTools.includes('fetch')) {
server.registerTool(
  "kimi-fetch",
  {
    title: "kimi-fetch",
    description: `从指定 URL 获取网页内容，并以结构化的 markdown 格式返回。

kimi-fetch 会：
- 获取页面的完整 HTML 内容
- 提取核心信息（标题、正文、关键数据）
- 过滤广告和无关内容
- 返回格式化的 markdown

参数：
  - url (string): 要获取内容的网页 URL 地址

返回值：
  结构化的 markdown 格式内容，包括页面标题、摘要、正文和关键链接。

使用场景：
  ✅ 获取文章、博客、文档的完整内容
  ✅ 提取 API 文档、技术规范的详细信息
  ✅ 从单个页面收集结构化数据

注意事项：
  - 需要安装 kimi CLI 工具
  - 页面获取通常需要 10-30 秒
  - 某些动态加载的页面可能内容不完整`,
    inputSchema: FetchUrlSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: FetchUrlInput) => {
    try {
      const result = await executeKimiFetch(params.url);

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error) {
      return handleToolError(error, '获取页面出错');
    }
  }
);
}

// 注册 kimi-image 工具
if (enabledTools.includes('image')) {
server.registerTool(
  "kimi-image",
  {
    title: "kimi-image",
    description: `分析图片内容，结合场景上下文提供有针对性的专业分析。

kimi-image 会：
- 读取并理解图片的视觉内容
- 结合用户指定的场景（如 web 开发、UI 设计等）进行分析
- 提取与场景相关的关键信息
- 提供基于场景的专业建议

参数：
  - imagePath (string): 要分析的图片文件的绝对路径
  - scene (string): 场景上下文，如 "web 站点开发"、"UI 设计审查"、"代码截图分析" 等
  - instruction (string, 可选): 额外的分析指令

返回值：
  结构化的图片分析报告，包括内容描述、关键信息提取和专业建议。

使用场景：
  ✅ 分析 UI 设计稿，提取布局、配色、组件信息
  ✅ 审查代码截图，识别问题和改进点
  ✅ 分析产品原型图，评估交互流程
  ✅ 识别图片中的文字、图表、数据

注意事项：
  - 需要安装 kimi CLI 工具
  - 图片分析通常需要 20-60 秒
  - 场景描述越具体，分析结果越精准

示例调用：
  imagePath: "/Users/xxx/Desktop/design-mockup.png"
  scene: "web 站点开发"
  instruction: "重点关注响应式布局问题"`,
    inputSchema: ImageAnalysisSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: ImageAnalysisInput) => {
    try {
      const result = await executeKimiImage(params.imagePath, params.scene, params.instruction);

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error) {
      return handleToolError(error, '图片分析出错');
    }
  }
);
}

// 注册 kimi-video 工具
if (enabledTools.includes('video')) {
server.registerTool(
  "kimi-video",
  {
    title: "kimi-video",
    description: `分析视频内容，结合场景上下文提供有针对性的专业分析。

kimi-video 会：
- 读取并理解视频的视听内容
- 根据场景自行决定最合适的分析方式（如抽帧、描述动作序列、识别关键事件等）
- 提取与场景相关的关键信息
- 提供基于场景的专业建议

参数：
  - videoPath (string): 要分析的视频文件的绝对路径
  - scene (string): 场景上下文，如 "产品演示审查"、"UI 动效评估"、"教学视频分析" 等
  - instruction (string, 可选): 额外的分析指令

返回值：
  结构化的视频分析报告，包括内容概述、关键信息提取和专业建议。

使用场景：
  ✅ 分析产品演示视频，提取功能展示流程
  ✅ 审查 UI 动效，评估转场和节奏
  ✅ 分析教学视频，梳理步骤和要点
  ✅ 识别视频中的人物、物体、文字和事件顺序

注意事项：
  - 需要安装 kimi CLI 工具
  - 视频分析通常需要 30-120 秒，复杂视频可能更长
  - 视频文件大小不得超过 100MB（Kimi CLI 限制）
  - 场景描述越具体，分析结果越精准

示例调用：
  videoPath: "/Users/xxx/Desktop/demo.mp4"
  scene: "产品演示审查"
  instruction: "重点关注核心功能展示顺序"`,
    inputSchema: VideoAnalysisSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: VideoAnalysisInput) => {
    try {
      const result = await executeKimiVideo(params.videoPath, params.scene, params.instruction);

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error) {
      return handleToolError(error, '视频分析出错');
    }
  }
);
}

// 主函数
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("kimi-tools-mcp Server 正在通过 stdio 运行");
}

// 仅在直接运行时启动服务器（vitest 等 import 场景不触发）
if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) {
  main().catch(error => {
    console.error("服务器错误:", error);
    process.exit(1);
  });
}
