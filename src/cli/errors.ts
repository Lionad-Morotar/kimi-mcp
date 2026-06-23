export type KimiErrorCode = 'NOT_FOUND' | 'TIMEOUT' | 'INCOMPATIBLE' | 'EXEC';

/**
 * 兼容层统一错误。带 code 便于上层（MCP handler）按类型决定文案与日志级别。
 */
export class KimiCliError extends Error {
  constructor(message: string, public code: KimiErrorCode) {
    super(message);
    this.name = 'KimiCliError';
  }
}

/** 判断错误是否为 kimi CLI 版本不兼容（INCOMPATIBLE）。供上层决定是否提示排查版本。 */
export function isVersionIncompatible(error: unknown): boolean {
  return error instanceof KimiCliError && error.code === 'INCOMPATIBLE';
}
