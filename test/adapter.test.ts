import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executor } from '../src/cli/executor'

// mock detector，向 adapter 注入确定的 surface，隔离探测逻辑。
// 须同步导出 LEGACY_FLAG_MARKER（adapter 从 detector 复用，见 QA Bug-2）。
vi.mock('../src/cli/detector', () => ({
  detectKimi: vi.fn(),
  resetDetection: vi.fn(),
  LEGACY_FLAG_MARKER: '--final-message-only',
}))

import { detectKimi } from '../src/cli/detector'
import { runKimi } from '../src/cli/adapter'
import { KimiCliError } from '../src/cli/errors'

function mockDetect(surface: 'legacy' | 'modern') {
  vi.mocked(detectKimi).mockResolvedValue({ surface, version: null, source: 'capability' })
}

function lastCall() {
  return (executor.execFileAsync as any).mock.calls.at(-1) as [string, string[], any]
}

describe('runKimi', () => {
  beforeEach(() => {
    vi.spyOn(executor, 'execFileAsync').mockReset()
    vi.mocked(detectKimi).mockReset()
  })

  it('modern surface: 命令为 [-p, prompt]，返回 stdout.trim()', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '  结果文本  ', stderr: '' })

    const result = await runKimi('你好', { timeoutMs: 1000, errorLabel: '测试' })

    expect(result).toBe('结果文本')
    const [, args] = lastCall()
    expect(args).toEqual(['-p', JSON.stringify('你好')])
  })

  it('legacy surface: 命令含 --print/--output-format stream-json/--final-message-only', async () => {
    mockDetect('legacy')
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'legacy 结果', stderr: '' })

    await runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })

    const [, args] = lastCall()
    expect(args).toEqual([
      '-p',
      JSON.stringify('hi'),
      '--print',
      '--output-format',
      'stream-json',
      '--final-message-only',
    ])
  })

  it('timeoutMs 映射到 options.timeout，maxBuffer 固定 10MB', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'ok', stderr: '' })

    await runKimi('hi', { timeoutMs: 120000, errorLabel: '测试' })

    const [, , opts] = lastCall()
    expect(opts.timeout).toBe(120000)
    expect(opts.maxBuffer).toBe(10 * 1024 * 1024)
  })

  it('ENOENT → KimiCliError(NOT_FOUND)', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(
      Object.assign(new Error('spawn kimi ENOENT'), { code: 'ENOENT' }),
    )

    await expect(runKimi('hi', { timeoutMs: 1000, errorLabel: '获取页面' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('ETIMEDOUT → KimiCliError(TIMEOUT)，message 含 errorLabel', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(new Error('Command timed out: ETIMEDOUT'))

    await expect(
      runKimi('hi', { timeoutMs: 1000, errorLabel: '图片分析' }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' })
    await expect(
      runKimi('hi', { timeoutMs: 1000, errorLabel: '图片分析' }),
    ).rejects.toThrow(/图片分析/)
  })

  it('非零退出 + stderr 含 unknown option → KimiCliError(INCOMPATIBLE)', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(
      Object.assign(new Error('Command failed'), {
        stderr: "error: unknown option '--print'",
        code: 1,
      }),
    )

    await expect(runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })).rejects.toMatchObject({
      code: 'INCOMPATIBLE',
    })
  })

  it('其他非零退出 → KimiCliError(EXEC)，message 含 stderr 摘要', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(
      Object.assign(new Error('Command failed'), { stderr: '一些其他错误', code: 2 }),
    )

    await expect(runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })).rejects.toMatchObject({
      code: 'EXEC',
    })
    await expect(runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })).rejects.toThrow(
      /一些其他错误/,
    )
  })

  it('抛出的错误为 KimiCliError 实例', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(
      Object.assign(new Error('spawn kimi ENOENT'), { code: 'ENOENT' }),
    )

    await expect(runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })).rejects.toBeInstanceOf(
      KimiCliError,
    )
  })

  it('清洗 modern kimi -p 输出前的 "• " markdown bullet 前缀', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '• 结果文本', stderr: '' })

    const result = await runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })

    expect(result).toBe('结果文本')
  })

  it('无 bullet 前缀的输出原样返回', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '普通文本', stderr: '' })

    const result = await runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })

    expect(result).toBe('普通文本')
  })

  it('清洗 modern kimi -p 输出结尾的 session 恢复提示', async () => {
    mockDetect('modern')
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({
      stdout: '• 页面内容\n\nTo resume this session: kimi -r session_abc123\n',
      stderr: '',
    })

    const result = await runKimi('hi', { timeoutMs: 1000, errorLabel: '测试' })

    expect(result).toBe('页面内容')
  })
})
