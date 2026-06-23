import { execFileSync } from 'node:child_process'
import { logTest } from './logger'

export interface EvalResult {
  pass: boolean
  reason: string
}

/**
 * 使用 kimi LLM 评估内容是否满足质量标准。
 *
 * 不检查具体字符匹配，而是让 LLM 从语义层面判断：
 * - prompt 构造是否符合预期
 * - 输出是否满足场景化分析的要求
 * - 错误处理是否合理
 *
 * 每次评估的结果会自动写入 test/.logs/ 目录。
 */
export function runKimiEval(content: string, criteria: string): EvalResult {
  const evalPrompt = `你是一位严格的测试评估员。请评估以下内容是否满足给定的质量标准。

## 被评估内容
${content}

## 评估标准
${criteria}

## 输出要求
返回一个 JSON 对象，格式严格为：
{"pass": boolean, "reason": "string"}

不要添加 markdown 代码块标记，不要添加任何解释文字。只返回纯 JSON。`

  // 获取当前测试名用于日志文件名
  let testName = 'unknown'
  try {
    // @ts-ignore expect 在 vitest 环境中可用
    testName = expect.getState().currentTestName || 'unknown'
  } catch {
    // 忽略
  }
  const safeName = testName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)

  // 记录评估输入
  logTest(safeName, '评估内容 (Content)', content)
  logTest(safeName, '评估标准 (Criteria)', criteria)

  try {
    const stdout = execFileSync(
      'kimi',
      // modern surface（kimi ≥0.12）：-p 默认 text 输出，直接返回纯文本
      ['-p', JSON.stringify(evalPrompt)],
      { encoding: 'utf-8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 },
    )

    // kimi -p 默认输出纯文本；modern 版本可能在输出前加 markdown 前缀（如 "• "），
    // 或包裹 ```json 代码块。提取首个 {...} JSON 对象以稳健解析。
    const jsonMatch = stdout.match(/\{[\s\S]*\}/)
    let cleaned = (jsonMatch ? jsonMatch[0] : stdout).trim().replace(/^```json\s*|\s*```$/g, '')

    const parsed = JSON.parse(cleaned) as EvalResult
    if (typeof parsed.pass !== 'boolean' || typeof parsed.reason !== 'string') {
      throw new Error('Invalid result shape')
    }

    // 记录评估结果
    logTest(safeName, '评估结果 (Result)', `pass: ${parsed.pass}\nreason: ${parsed.reason}`)

    return parsed
  } catch (err: any) {
    const reason = `评估失败: ${err.message || String(err)}`
    logTest(safeName, '评估结果 (Result)', `pass: false\nreason: ${reason}`)
    return {
      pass: false,
      reason,
    }
  }
}
