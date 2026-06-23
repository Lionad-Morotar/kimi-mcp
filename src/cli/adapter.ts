import { executor } from "./executor.js";
import { detectKimi, LEGACY_FLAG_MARKER, type KimiSurface } from "./detector.js";
import { KimiCliError } from "./errors.js";

export interface KimiRunOptions {
  timeoutMs: number;
  /** 错误文案语义标签，如 "获取页面"/"图片分析"/"任务执行" */
  errorLabel: string;
}

// legacy surface（kimi ≤0.11.x）的固定附加参数。
// modern surface 仅需 -p，输出默认 text 即纯文本（等价于 legacy 下 --final-message-only 的语义）。
// 末位 flag 复用 detector 的 LEGACY_FLAG_MARKER，确保探测与构造同源（见 QA Bug-2）。
const LEGACY_FLAGS = ['--print', '--output-format', 'stream-json', LEGACY_FLAG_MARKER];

// 子进程 stdout/stderr 缓冲区上限
const MAX_BUFFER = 10 * 1024 * 1024;

// modern kimi -p 输出有两类固定包装噪音，清洗后保证 fetch/search/image 返回干净内容：
// 1. 开头的 markdown bullet 前缀 "• "（U+2022 + space），整段响应被包成 bullet item
// 2. 结尾的 session 恢复提示 "To resume this session: kimi -r <id>"
// 仅剥离 kimi 的包装，不影响用户内容本身的 markdown 结构。
const BULLET_PREFIX = '• ';
const SESSION_TRAILER = /To resume this session: kimi -r \S+/g;
function cleanKimiOutput(stdout: string): string {
  const noTrailer = stdout.replace(SESSION_TRAILER, '').trim();
  return noTrailer.startsWith(BULLET_PREFIX) ? noTrailer.slice(BULLET_PREFIX.length) : noTrailer;
}

/** 按探测到的 surface 构造 kimi 命令参数。 */
function buildArgs(prompt: string, surface: KimiSurface): string[] {
  // JSON.stringify 保证多行/特殊字符 prompt 作为单一 argv 安全传递（保持 v0.3.0 wire 行为）
  const promptArg = JSON.stringify(prompt);
  return surface === 'legacy' ? ['-p', promptArg, ...LEGACY_FLAGS] : ['-p', promptArg];
}

/**
 * 将底层子进程错误翻译为带 code 的 KimiCliError。
 *
 * 识别四类：
 * - NOT_FOUND：命令缺失（ENOENT）
 * - TIMEOUT：子进程超时
 * - INCOMPATIBLE：非零退出且 stderr 含 "unknown option"（kimi 版本不兼容）
 * - EXEC：其他非零退出，透传 stderr 摘要
 */
function classifyError(error: unknown, errorLabel: string): KimiCliError {
  const err = error as { message?: string; code?: string | number; stderr?: string };
  const msg = String(err?.message ?? error);

  if (msg.includes('ENOENT') || err?.code === 'ENOENT') {
    return new KimiCliError(
      '未找到 kimi 命令。请确保 kimi CLI 已安装并添加到 PATH 中。',
      'NOT_FOUND',
    );
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
    return new KimiCliError(`${errorLabel}超时。请稍后重试或简化任务。`, 'TIMEOUT');
  }
  const stderr = String(err?.stderr ?? '').trim();
  if (stderr.includes('unknown option')) {
    return new KimiCliError(
      `${errorLabel}失败：Kimi CLI 版本可能不兼容（探测到未知 flag）。请检查 kimi 版本。\n${stderr}`,
      'INCOMPATIBLE',
    );
  }
  return new KimiCliError(`${errorLabel}失败: ${msg}${stderr ? `\n${stderr}` : ''}`, 'EXEC');
}

/**
 * 兼容层对外稳定接口：输入 prompt 与超时，输出纯文本结果。
 *
 * 内部协调：探测 surface → 构造命令 → 执行子进程 → 解析输出 → 统一错误翻译。
 * 三个 MCP Tool 唯一的 kimi 调用入口。kimi CLI 改 flag 时只需改本文件。
 */
export async function runKimi(prompt: string, opts: KimiRunOptions): Promise<string> {
  const { surface } = await detectKimi();
  const args = buildArgs(prompt, surface);

  try {
    const { stdout } = await executor.execFileAsync('kimi', args, {
      timeout: opts.timeoutMs,
      maxBuffer: MAX_BUFFER,
    });
    return cleanKimiOutput(stdout);
  } catch (error) {
    throw classifyError(error, opts.errorLabel);
  }
}
