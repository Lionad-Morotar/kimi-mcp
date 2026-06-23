import { runKimi } from "../cli/adapter.js";

/** 构造 kimi-search 的任务指令（含上下文头与工具超时模板）。 */
export function buildSearchPrompt(instruction: string): string {
  return `## Context\n* use 90 seconds timeout for tools\n\n以下是具体的网络搜索或分析任务\n\n---\n\n${instruction}`;
}

/**
 * 执行 kimi-search 任务，经由兼容层调用 kimi。
 * 超时 5 分钟，错误语义标签为「任务执行」。
 */
export async function executeKimiAgent(instruction: string): Promise<string> {
  return runKimi(buildSearchPrompt(instruction), {
    timeoutMs: 300000,
    errorLabel: '任务执行',
  });
}
