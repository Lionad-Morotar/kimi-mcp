import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  executor,
  executeKimiAgent,
  executeKimiFetch,
  executeKimiImage,
  executeKimiVideo,
  AgentInstructionSchema,
  FetchUrlSchema,
  ImageAnalysisSchema,
  VideoAnalysisSchema,
  parseToolConfig,
} from '../src/index'
import { runKimiEval } from './helpers'
import { logTest } from './logger'

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const testVideoPath = join(projectRoot, 'zRefs', 'video-samples', 'sample-small.mp4')
function getLastPrompt(): string {
  const lastCall = (executor.execFileAsync as any).mock?.calls?.at(-1)
  expect(lastCall).toBeDefined()
  const args = lastCall![1] as string[]
  const promptIndex = args.indexOf('-p') + 1
  return JSON.parse(args[promptIndex])
}

// 辅助：从最近一次调用中提取 options
function getLastOptions(): any {
  const lastCall = (executor.execFileAsync as any).mock?.calls?.at(-1)
  expect(lastCall).toBeDefined()
  return lastCall![2] as any
}

describe('kimi-search', () => {
  beforeEach(() => {
    vi.spyOn(executor, 'execFileAsync').mockReset()
  })

  it('prompt 应包含 context header 并将指令嵌入任务描述', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '搜索完成', stderr: '' })

    await executeKimiAgent('搜索 Vue 3 组合式 API 最佳实践，总结核心要点')

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的任务指令。要求：' +
        '1. 必须包含 "Context" 或上下文相关的引导语；' +
        '2. 必须将原始任务 "搜索 Vue 3 组合式 API 最佳实践，总结核心要点" 嵌入其中。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('search prompt eval:', result.reason)
  })

  it('应经由兼容层以 modern 参数调用 kimi（仅 -p + prompt）', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'ok', stderr: '' })

    await executeKimiAgent('test')

    const calls = (executor.execFileAsync as any).mock.calls
    // 最后一次调用是实际执行（-p prompt）；命令构造细节由 adapter.test.ts 覆盖
    const lastCall = calls.at(-1)
    expect(lastCall![0]).toBe('kimi')
    const args = lastCall![1] as string[]
    expect(args).toContain('-p')
    // modern surface 不应再出现已移除的 legacy flag
    expect(args).not.toContain('--print')
    expect(args).not.toContain('--final-message-only')

    logTest('search-cli-args', 'CLI 参数', args.join(' '))
  })

  it('超时 5 分钟，buffer 10MB', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'ok', stderr: '' })

    await executeKimiAgent('test')

    const opts = getLastOptions()
    expect(opts.timeout).toBe(300000)
    expect(opts.maxBuffer).toBe(10 * 1024 * 1024)

    logTest('search-timeout', 'Options', JSON.stringify(opts, null, 2))
  })

  it('ENOENT 错误应提示安装 kimi CLI', async () => {
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(new Error('spawn kimi ENOENT'))

    await expect(executeKimiAgent('test')).rejects.toThrow('未找到 kimi 命令')

    logTest('search-enoent', '错误信息', 'spawn kimi ENOENT → 未找到 kimi 命令')
  })

  it('ETIMEDOUT 错误应提示超时', async () => {
    vi.spyOn(executor, 'execFileAsync').mockRejectedValue(new Error('ETIMEDOUT'))

    await expect(executeKimiAgent('test')).rejects.toThrow('任务执行超时')

    logTest('search-etimedout', '错误信息', 'ETIMEDOUT → 任务执行超时')
  })

  it('schema 应拒绝空 instruction', () => {
    const result = AgentInstructionSchema.safeParse({ instruction: '' })
    expect(result.success).toBe(false)
  })
})

describe('kimi-fetch', () => {
  beforeEach(() => {
    vi.spyOn(executor, 'execFileAsync').mockReset()
  })

  it('prompt 应要求获取页面并以 markdown 结构化返回', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '页面内容', stderr: '' })

    await executeKimiFetch('https://example.com/article')

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的网页内容获取指令。要求：' +
        '1. 必须包含目标 URL "https://example.com/article"；' +
        '2. 必须要求以 markdown 格式返回；' +
        '3. 必须要求过滤广告、导航栏等无关内容；' +
        '4. 必须要求提取页面核心信息（标题、正文等）。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('fetch prompt eval:', result.reason)
  })

  it('超时 2 分钟', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'ok', stderr: '' })

    await executeKimiFetch('https://example.com')

    const opts = getLastOptions()
    expect(opts.timeout).toBe(120000)

    logTest('fetch-timeout', 'Options', JSON.stringify(opts, null, 2))
  })

  it('schema 应拒绝空 URL', () => {
    const result = FetchUrlSchema.safeParse({ url: '' })
    expect(result.success).toBe(false)
  })
})

describe('kimi-image', () => {
  beforeEach(() => {
    vi.spyOn(executor, 'execFileAsync').mockReset()
  })

  it('prompt 应引用场景并要求有针对性的图片分析', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '图片分析完成', stderr: '' })

    await executeKimiImage('/assets/test-image.jpg', 'web 站点开发')

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的图片分析指令。要求：' +
        '1. 必须引用场景 "web 站点开发"；' +
        '2. 必须明确说明是在该场景下分析图片；' +
        '3. 必须要求输出结构化的分析（如内容描述、关键信息、专业建议等）；' +
        '4. 必须引用图片路径 "/assets/test-image.jpg"。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('image prompt eval:', result.reason)
  })

  it('有 instruction 时 prompt 应包含额外分析要求', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '分析完成', stderr: '' })

    await executeKimiImage(
      '/assets/test-image.jpg',
      'UI 设计审查',
      '重点关注响应式布局问题',
    )

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的图片分析指令。要求：' +
        '1. 必须包含额外分析要求，与 "重点关注响应式布局问题" 相关；' +
        '2. 场景 "UI 设计审查" 必须在 prompt 中被引用；' +
        '3. 不能丢失结构化输出要求。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('image+instruction eval:', result.reason)
  })

  it('无 instruction 时不应追加额外要求', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '分析完成', stderr: '' })

    await executeKimiImage('/assets/test-image.jpg', '代码截图分析')

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的图片分析指令。要求：' +
        '1. 场景 "代码截图分析" 必须在 prompt 中被引用；' +
        '2. prompt 中不应包含与 "额外分析"、"额外要求" 相关的指令（因为没有提供额外指令）；' +
        '3. 必须有结构化输出要求。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('image no-instruction eval:', result.reason)
  })

  it('超时 5 分钟', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'ok', stderr: '' })

    await executeKimiImage('/assets/test-image.jpg', 'test')

    const opts = getLastOptions()
    expect(opts.timeout).toBe(300000)

    logTest('image-timeout', 'Options', JSON.stringify(opts, null, 2))
  })

  it('schema 应拒绝空 imagePath', () => {
    const result = ImageAnalysisSchema.safeParse({
      imagePath: '',
      scene: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('schema 应拒绝空 scene', () => {
    const result = ImageAnalysisSchema.safeParse({
      imagePath: '/assets/test-image.jpg',
      scene: '',
    })
    expect(result.success).toBe(false)
  })

  it('schema 应允许省略 instruction', () => {
    const result = ImageAnalysisSchema.safeParse({
      imagePath: '/assets/test-image.jpg',
      scene: 'test',
    })
    expect(result.success).toBe(true)
  })
})

describe('kimi-video', () => {
  beforeEach(() => {
    vi.spyOn(executor, 'execFileAsync').mockReset()
  })

  it('prompt 应引用场景并要求 kimi 自行决定分析方式', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '视频分析完成', stderr: '' })

    await executeKimiVideo(testVideoPath, '产品演示审查')

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的视频分析指令。要求：' +
        '1. 必须引用场景 "产品演示审查"；' +
        '2. 必须明确说明是在该场景下分析视频；' +
        '3. 必须要求 kimi 自行决定最合适的分析方式（如抽帧、动作序列、关键事件等）；' +
        '4. 必须引用视频路径 "' + testVideoPath + '"；' +
        '5. 必须有结构化的中文输出要求。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('video prompt eval:', result.reason)
  })

  it('有 instruction 时 prompt 应包含额外分析要求', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '分析完成', stderr: '' })

    await executeKimiVideo(
      testVideoPath,
      'UI 动效评估',
      '重点关注转场节奏',
    )

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的视频分析指令。要求：' +
        '1. 必须包含额外分析要求，与 "重点关注转场节奏" 相关；' +
        '2. 场景 "UI 动效评估" 必须在 prompt 中被引用；' +
        '3. 不能丢失自行决定分析方式的结构化输出要求。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('video+instruction eval:', result.reason)
  })

  it('无 instruction 时不应追加额外要求', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: '分析完成', stderr: '' })

    await executeKimiVideo(testVideoPath, '教学视频分析')

    const prompt = getLastPrompt()
    const result = runKimiEval(
      prompt,
      '这个 prompt 是给 kimi CLI 的视频分析指令。要求：' +
        '1. 场景 "教学视频分析" 必须在 prompt 中被引用；' +
        '2. prompt 中不应包含与 "额外分析"、"额外要求" 相关的指令（因为没有提供额外指令）；' +
        '3. 必须有结构化输出要求和自行决定分析方式的说明。',
    )

    expect(result.pass).toBe(true)
    if (!result.pass) console.error('video no-instruction eval:', result.reason)
  })

  it('超时 10 分钟', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'ok', stderr: '' })

    await executeKimiVideo(testVideoPath, 'test')

    const opts = getLastOptions()
    expect(opts.timeout).toBe(600000)

    logTest('video-timeout', 'Options', JSON.stringify(opts, null, 2))
  })

  it('schema 应拒绝空 videoPath', () => {
    const result = VideoAnalysisSchema.safeParse({
      videoPath: '',
      scene: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('schema 应拒绝空 scene', () => {
    const result = VideoAnalysisSchema.safeParse({
      videoPath: testVideoPath,
      scene: '',
    })
    expect(result.success).toBe(false)
  })

  it('schema 应允许省略 instruction', () => {
    const result = VideoAnalysisSchema.safeParse({
      videoPath: testVideoPath,
      scene: 'test',
    })
    expect(result.success).toBe(true)
  })

  it('文件不存在时应提前抛出可读错误', async () => {
    vi.spyOn(executor, 'execFileAsync').mockResolvedValue({ stdout: 'ok', stderr: '' })

    await expect(
      executeKimiVideo('/this/path/does/not/exist.mp4', 'test'),
    ).rejects.toThrow('视频文件不存在或无法访问')
  })
})

describe('parseToolConfig', () => {
  const originalEnv = process.env.KIMI_TOOLS

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.KIMI_TOOLS
    } else {
      process.env.KIMI_TOOLS = originalEnv
    }
  })

  it('未设置环境变量时返回空数组', () => {
    delete process.env.KIMI_TOOLS
    const result = parseToolConfig()
    expect(result).toEqual([])
    logTest('config-unset', '环境变量', '未设置 (delete)')
    logTest('config-unset', '返回结果', JSON.stringify(result))
  })

  it('空字符串时返回空数组', () => {
    process.env.KIMI_TOOLS = ''
    const result = parseToolConfig()
    expect(result).toEqual([])
    logTest('config-empty', '环境变量', '""')
    logTest('config-empty', '返回结果', JSON.stringify(result))
  })

  it('"all" 返回全部工具', () => {
    process.env.KIMI_TOOLS = 'all'
    const result = parseToolConfig()
    expect(result).toEqual(['search', 'fetch', 'image', 'video'])
    logTest('config-all', '环境变量', '"all"')
    logTest('config-all', '返回结果', JSON.stringify(result))
  })

  it('逗号分隔的字符串返回对应工具', () => {
    process.env.KIMI_TOOLS = 'search,fetch'
    const result = parseToolConfig()
    expect(result).toEqual(['search', 'fetch'])
    logTest('config-comma', '环境变量', '"search,fetch"')
    logTest('config-comma', '返回结果', JSON.stringify(result))
  })

  it('自动去除空格', () => {
    process.env.KIMI_TOOLS = ' search , fetch '
    const result = parseToolConfig()
    expect(result).toEqual(['search', 'fetch'])
    logTest('config-trim', '环境变量', '" search , fetch "')
    logTest('config-trim', '返回结果', JSON.stringify(result))
  })

  it('单个工具返回单元素数组', () => {
    process.env.KIMI_TOOLS = 'image'
    const result = parseToolConfig()
    expect(result).toEqual(['image'])
    logTest('config-single', '环境变量', '"image"')
    logTest('config-single', '返回结果', JSON.stringify(result))
  })
})