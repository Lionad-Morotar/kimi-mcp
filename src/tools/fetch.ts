import { runKimi } from "../cli/adapter.js";

/** 构造 kimi-fetch 的页面获取指令。 */
export function buildFetchPrompt(url: string): string {
  return `获取并以 md 格式返回结构化的页面内容：

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
}

/**
 * 执行 kimi-fetch 任务，经由兼容层调用 kimi。
 * 超时 2 分钟，错误语义标签为「获取页面」。
 */
export async function executeKimiFetch(url: string): Promise<string> {
  return runKimi(buildFetchPrompt(url), {
    timeoutMs: 120000,
    errorLabel: '获取页面',
  });
}
