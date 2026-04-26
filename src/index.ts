#!/usr/bin/env node
/**
 * kimi-tools-mcp MCP Server
 *
 * 此服务器将 kimi 作为智能代理(agent)暴露给 MCP 客户端，
 * 支持执行复杂的搜索、内容获取和信息整合任务。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";

// 包装在对象中，使 vitest spy/mock 可以正确拦截内部调用
export const executor = {
  execFileAsync: promisify(execFile),
};

// Zod 模式用于输入验证
const AgentInstructionSchema = z.object({
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
const FetchUrlSchema = z.object({
  url: z.string()
    .min(1, "URL 不能为空")
    .describe("要获取内容的网页 URL 地址")
}).strict();

// kimi-image 输入模式
const ImageAnalysisSchema = z.object({
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

type AgentInstruction = z.infer<typeof AgentInstructionSchema>;
type FetchUrlInput = z.infer<typeof FetchUrlSchema>;
type ImageAnalysisInput = z.infer<typeof ImageAnalysisSchema>;

// 执行 kimi-search 任务
async function executeKimiAgent(_instruction: string): Promise<string> {
  const instruction = `## Context\n* use 90 seconds timeout for tools\n\n以下是具体的网络搜索或分析任务\n\n---\n\n${_instruction}`
  try {
    const { stdout } = await executor.execFileAsync("kimi", [
      "-p",
      JSON.stringify(instruction),
      "--print",
      "--output-format",
      "stream-json",
      "--final-message-only"
    ], {
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024 // 10MB 缓冲区
    });

    return stdout.trim();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        throw new Error("未找到 kimi 命令。请确保 kimi CLI 已安装并添加到 PATH 中。");
      }
      if (error.message.includes("ETIMEDOUT")) {
        throw new Error("任务执行超时。kimi-search 可能需要更长时间处理复杂任务，请稍后重试或简化任务。");
      }
      throw new Error(`任务执行失败: ${error.message}`);
    }
    throw error;
  }
}

// 执行 kimi-fetch 任务 - 获取单个 URL 的页面内容
async function executeKimiFetch(url: string): Promise<string> {
  const instruction = `获取并以 md 格式返回结构化的页面内容：

URL: ${url}

要求：
1. 使用 WebFetch 或浏览器工具获取页面完整内容
2. 提取页面的核心信息（标题、主要内容、关键数据等）
3. 返回格式化的 markdown，包括：
   - 页面标题
   - 内容摘要
   - 结构化正文（保留重要段落、列表、代码块等）
   - 关键链接（如有）
4. 过滤掉广告、导航栏、页脚等无关内容
5. 不要修改或注释页面内容

直接返回 markdown 格式的内容，不要添加额外的解释。`;

  try {
    const { stdout } = await executor.execFileAsync("kimi", [
      "-p",
      JSON.stringify(instruction),
      "--print",
      "--output-format",
      "stream-json",
      "--final-message-only"
    ], {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024 // 10MB 缓冲区
    });

    return stdout.trim();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        throw new Error("未找到 kimi 命令。请确保 kimi CLI 已安装并添加到 PATH 中。");
      }
      if (error.message.includes("ETIMEDOUT")) {
        throw new Error("获取页面超时。请检查 URL 是否可访问，或稍后重试。");
      }
      throw new Error(`获取页面失败: ${error.message}`);
    }
    throw error;
  }
}

// 执行 kimi-image 任务 - 分析图片内容
async function executeKimiImage(imagePath: string, scene: string, instruction?: string): Promise<string> {
  let prompt = `用户在 ${scene} 任务中提供了一张图片，请详细描述并分析这张图片：\n\n${imagePath}`;

  if (instruction && instruction.trim()) {
    prompt += `\n\n额外分析要求：${instruction.trim()}`;
  }

  prompt += `\n\n请结合「${scene}」这一场景上下文，提供有针对性的分析：`;
  prompt += `\n1. 图片内容的详细描述（元素、布局、色彩、文字等）`;
  prompt += `\n2. 与场景相关的关键信息提取`;
  prompt += `\n3. 基于场景的专业建议或洞察`;
  prompt += `\n\n请用中文回答。`;

  try {
    const { stdout } = await executor.execFileAsync("kimi", [
      "-p",
      JSON.stringify(prompt),
      "--print",
      "--output-format",
      "stream-json",
      "--final-message-only"
    ], {
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024 // 10MB 缓冲区
    });

    return stdout.trim();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        throw new Error("未找到 kimi 命令。请确保 kimi CLI 已安装并添加到 PATH 中。");
      }
      if (error.message.includes("ETIMEDOUT")) {
        throw new Error("图片分析超时。请稍后重试或简化分析要求。");
      }
      throw new Error(`图片分析失败: ${error.message}`);
    }
    throw error;
  }
}

// 创建 MCP 服务器实例
const server = new McpServer({
  name: "kimi-tools-mcp",
  version: "0.3.0"
});

// 注册 kimi-search 工具
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `任务执行出错: ${errorMessage}`
        }]
      };
    }
  }
);

// 注册 kimi-fetch 工具
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `获取页面出错: ${errorMessage}`
        }]
      };
    }
  }
);

// 注册 kimi-image 工具
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `图片分析出错: ${errorMessage}`
        }]
      };
    }
  }
);

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

// 导出供测试使用
export { executeKimiAgent, executeKimiFetch, executeKimiImage };
export { AgentInstructionSchema, FetchUrlSchema, ImageAnalysisSchema };
