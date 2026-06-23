import { runKimi } from "../cli/adapter.js";

/** 构造 kimi-image 的图片分析指令。 */
export function buildImagePrompt(imagePath: string, scene: string, instruction?: string): string {
  let prompt = `用户在 ${scene} 任务中提供了一张图片，请详细描述并分析这张图片：\n\n${imagePath}`;

  if (instruction && instruction.trim()) {
    prompt += `\n\n额外分析要求：${instruction.trim()}`;
  }

  prompt += `\n\n请结合「${scene}」这一场景上下文，提供有针对性的分析：`;
  prompt += `\n1. 图片内容的详细描述（元素、布局、色彩、文字等）`;
  prompt += `\n2. 与场景相关的关键信息提取`;
  prompt += `\n3. 基于场景的专业建议或洞察`;
  prompt += `\n\n请用中文回答。`;
  return prompt;
}

/**
 * 执行 kimi-image 任务，经由兼容层调用 kimi。
 * 超时 5 分钟，错误语义标签为「图片分析」。
 */
export async function executeKimiImage(
  imagePath: string,
  scene: string,
  instruction?: string,
): Promise<string> {
  return runKimi(buildImagePrompt(imagePath, scene, instruction), {
    timeoutMs: 300000,
    errorLabel: '图片分析',
  });
}
