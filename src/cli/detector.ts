import { executor } from "./executor.js";

export type KimiSurface = 'legacy' | 'modern';
export type DetectionSource = 'capability' | 'version' | 'fallback';

export interface DetectedKimi {
  surface: KimiSurface;
  version: string | null;
  source: DetectionSource;
}

// 能力探测的特征字符串：--help 含此字样即判为 legacy surface。
// 导出供 adapter 复用，确保 flag 漂移时单点修改（见 ADR 0001、QA Bug-2）。
export const LEGACY_FLAG_MARKER = '--final-message-only';

// 版本兜底的断点：major>0 或 (major==0 且 minor>=12) 视为 modern。
// 仅在能力探测失败时使用，是 best-effort 启发式（见 ADR 0001）。
const MODERN_VERSION_MAJOR = 0;
const MODERN_VERSION_MINOR = 12;

// 探测调用（--help / --version）的子进程选项：必须带 timeout，否则 kimi 挂起会
// 永久阻塞 runKimi，且因模块级缓存无法降级到 fallback（见 QA Bug-1）。
const PROBE_OPTS = { timeout: 5000, maxBuffer: 10 * 1024 * 1024 };

let cache: DetectedKimi | null = null;

/** 解析 `kimi --version` 输出为 [major, minor]，无法解析返回 null。 */
function parseVersion(stdout: string): [number, number] | null {
  const match = stdout.trim().match(/(\d+)\.(\d+)\./);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10)];
}

/** 第一段：能力探测，解析 `kimi --help` 文本特征。失败返回 null。 */
async function detectByCapability(): Promise<DetectedKimi | null> {
  try {
    const { stdout } = await executor.execFileAsync('kimi', ['--help'], PROBE_OPTS);
    const surface: KimiSurface = stdout.includes(LEGACY_FLAG_MARKER) ? 'legacy' : 'modern';
    return { surface, version: null, source: 'capability' };
  } catch {
    return null;
  }
}

/** 第二段：版本兜底，解析 `kimi --version` 的 SemVer。失败返回 null。 */
async function detectByVersion(): Promise<DetectedKimi | null> {
  try {
    const { stdout } = await executor.execFileAsync('kimi', ['--version'], PROBE_OPTS);
    const parsed = parseVersion(stdout);
    if (!parsed) return null;
    const [major, minor] = parsed;
    const isModern =
      major > MODERN_VERSION_MAJOR ||
      (major === MODERN_VERSION_MAJOR && minor >= MODERN_VERSION_MINOR);
    return { surface: isModern ? 'modern' : 'legacy', version: stdout.trim(), source: 'version' };
  } catch {
    return null;
  }
}

/**
 * 探测当前安装的 Kimi CLI 属于哪套 flag surface。
 *
 * 三段式降级（见 ADR 0001）：
 * 1. 能力探测：解析 `kimi --help` 文本特征
 * 2. 版本兜底：解析 `kimi --version` 的 SemVer
 * 3. 全失败：降级 modern 并 warn（最保守的当前主流 surface）
 *
 * 结果模块级缓存；测试用 resetDetection() 清除。
 */
export async function detectKimi(): Promise<DetectedKimi> {
  if (cache) return cache;

  const byCapability = await detectByCapability();
  if (byCapability) {
    cache = byCapability;
    return cache;
  }

  const byVersion = await detectByVersion();
  if (byVersion) {
    cache = byVersion;
    return cache;
  }

  console.warn(
    '[kimi-tools-mcp] 无法探测 Kimi CLI 版本（kimi --help 与 --version 均失败），' +
      '默认采用 modern flag surface。若调用报 unknown option，请检查 kimi 安装。',
  );
  cache = { surface: 'modern', version: null, source: 'fallback' };
  return cache;
}

/** 清除探测缓存，供测试重置。 */
export function resetDetection(): void {
  cache = null;
}
