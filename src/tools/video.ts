import { access, stat } from "node:fs/promises";
import { runKimi } from "../cli/adapter.js";

/** Kimi CLI 的 ReadMediaFile 工具对媒体文件的大小上限（单位：字节）。 */
const KIMI_MEDIA_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;

/** 构造 kimi-video 的视频分析指令。 */
export function buildVideoPrompt(videoPath: string, scene: string, instruction?: string): string {
  let prompt = `用户在 ${scene} 任务中提供了一个视频，请分析这个视频。`;
  prompt += `\n\n视频路径：${videoPath}`;

  if (instruction && instruction.trim()) {
    prompt += `\n\n额外分析要求：${instruction.trim()}`;
  }

  prompt += `\n\n请根据「${scene}」这一场景和上述要求，自行决定最合适的分析方式，例如：`;
  prompt += `\n- 提取关键帧并按时间顺序描述画面变化；`;
  prompt += `\n- 分析动作、事件或演示流程的先后顺序；`;
  prompt += `\n- 识别画面中的文字、UI、人物或物体；`;
  prompt += `\n- 评估节奏、转场、动效或教学逻辑。`;
  prompt += `\n\n请结合场景提供有针对性的分析，输出结构化的中文报告：`;
  prompt += `\n1. 视频内容的整体概述；`;
  prompt += `\n2. 与场景相关的关键信息提取；`;
  prompt += `\n3. 基于场景的专业建议或洞察。`;

  return prompt;
}

/**
 * 检查视频文件是否可被 Kimi CLI 读取。
 *
 * 对齐 Kimi CLI 的 ReadMediaFile 能力边界：
 * - 文件必须存在且可读
 * - 大小不得超过 100MB（Kimi 侧明确限制）
 *
 * 不强制校验格式白名单，因为 Kimi 官方未公布具体支持的视频格式列表；
 * 不支持的格式会由 Kimi CLI 自身调用时报错，本层只做明确的前置拦截。
 */
async function validateVideoFile(videoPath: string): Promise<void> {
  try {
    await access(videoPath);
  } catch {
    throw new Error(`视频文件不存在或无法访问：${videoPath}`);
  }

  const fileStat = await stat(videoPath);
  if (!fileStat.isFile()) {
    throw new Error(`指定路径不是文件：${videoPath}`);
  }

  if (fileStat.size > KIMI_MEDIA_SIZE_LIMIT_BYTES) {
    throw new Error(
      `视频文件过大（${(fileStat.size / 1024 / 1024).toFixed(2)} MB），` +
        `Kimi CLI 最大支持 ${KIMI_MEDIA_SIZE_LIMIT_BYTES / 1024 / 1024} MB。`,
    );
  }
}

/**
 * 执行 kimi-video 任务，经由兼容层调用 kimi。
 * 超时 10 分钟，错误语义标签为「视频分析」。
 */
export async function executeKimiVideo(
  videoPath: string,
  scene: string,
  instruction?: string,
): Promise<string> {
  await validateVideoFile(videoPath);

  return runKimi(buildVideoPrompt(videoPath, scene, instruction), {
    timeoutMs: 600000,
    errorLabel: '视频分析',
  });
}
