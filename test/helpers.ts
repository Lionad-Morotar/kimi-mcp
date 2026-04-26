import { execFileSync } from 'node:child_process'

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

  try {
    const stdout = execFileSync(
      'kimi',
      [
        '-p',
        JSON.stringify(evalPrompt),
        '--print',
        '--final-message-only',
      ],
      { encoding: 'utf-8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 },
    )

    // kimi --final-message-only 直接返回文本
    let cleaned = stdout.trim().replace(/^```json\s*|\s*```$/g, '')

    const parsed = JSON.parse(cleaned) as EvalResult
    if (typeof parsed.pass !== 'boolean' || typeof parsed.reason !== 'string') {
      throw new Error('Invalid result shape')
    }
    return parsed
  } catch (err: any) {
    return {
      pass: false,
      reason: `评估失败: ${err.message || String(err)}`,
    }
  }
}
