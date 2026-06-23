import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executor } from '../src/cli/executor'
import { detectKimi, resetDetection } from '../src/cli/detector'

// 现代 kimi（0.12.x）的 --help 片段：无 --print / --final-message-only
const MODERN_HELP = `Usage: kimi [options] [command]
Options:
  -V, --version
  -p, --prompt <prompt>         Run one prompt non-interactively.
  --output-format <format>      Output format. (text, stream-json)`

// 旧版 kimi（0.11.x）的 --help 片段：含 --print / --final-message-only
const LEGACY_HELP = `Usage: kimi [options]
Options:
  -p, --prompt <prompt>
  --print                       Print mode
  --output-format <format>
  --final-message-only          Only final message`

describe('detectKimi', () => {
  beforeEach(() => {
    vi.spyOn(executor, 'execFileAsync').mockReset()
    resetDetection()
  })

  it('modern: --help 不含 --final-message-only → surface=modern, source=capability', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: MODERN_HELP, stderr: '' })

    const detected = await detectKimi()

    expect(detected.surface).toBe('modern')
    expect(detected.source).toBe('capability')
  })

  it('legacy: --help 含 --final-message-only → surface=legacy, source=capability', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: LEGACY_HELP, stderr: '' })

    const detected = await detectKimi()

    expect(detected.surface).toBe('legacy')
    expect(detected.source).toBe('capability')
  })

  it('--help 执行抛错时回退 --version：版本 0.12.1 → modern, source=version', async () => {
    const spy = vi.spyOn(executor, 'execFileAsync')
    spy
      .mockRejectedValueOnce(new Error('spawn error'))
      .mockResolvedValueOnce({ stdout: '0.12.1', stderr: '' })

    const detected = await detectKimi()

    expect(detected.surface).toBe('modern')
    expect(detected.source).toBe('version')
    expect(detected.version).toBe('0.12.1')
  })

  it('--help 失败且回退到旧版本号 0.11.0 → legacy, source=version', async () => {
    const spy = vi.spyOn(executor, 'execFileAsync')
    spy
      .mockRejectedValueOnce(new Error('spawn error'))
      .mockResolvedValueOnce({ stdout: '0.11.0', stderr: '' })

    const detected = await detectKimi()

    expect(detected.surface).toBe('legacy')
    expect(detected.source).toBe('version')
  })

  it('--help 与 --version 都失败 → modern, source=fallback（并 warn）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(new Error('no kimi'))

    const detected = await detectKimi()

    expect(detected.surface).toBe('modern')
    expect(detected.source).toBe('fallback')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('缓存：第二次 detectKimi 不再调用子进程', async () => {
    const spy = vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: MODERN_HELP, stderr: '' })

    await detectKimi()
    await detectKimi()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('resetDetection 后重新探测', async () => {
    const spy = vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: MODERN_HELP, stderr: '' })

    await detectKimi()
    resetDetection()
    await detectKimi()

    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('探测调用带 timeout 与 maxBuffer，避免 kimi 挂起永久阻塞降级链', async () => {
    const spy = vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: MODERN_HELP, stderr: '' })

    await detectKimi()

    const [, , opts] = spy.mock.calls[0]
    expect(opts.timeout).toBeGreaterThan(0)
    expect(opts.maxBuffer).toBeGreaterThan(1024 * 1024)
  })
})
