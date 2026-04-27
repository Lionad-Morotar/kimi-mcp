import { existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

let logDir: string | null = null

/**
 * 获取或创建本次测试运行的日志目录。
 *
 * 目录命名规则：test/.logs/YYYY-MM-DD-<turn>/
 * - turn 为当天第几次运行，从 1 开始递增
 */
function getLogDir(): string {
  if (logDir) return logDir

  const date = new Date().toISOString().slice(0, 10)
  const baseDir = join(import.meta.dirname, '.logs')

  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true })
  }

  const existing = readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith(date))
    .map(d => d.name)

  const turn = existing.length > 0
    ? Math.max(...existing.map(n => parseInt(n.split('-').pop() || '0'))) + 1
    : 1

  logDir = join(baseDir, `${date}-${turn}`)
  mkdirSync(logDir, { recursive: true })

  return logDir
}

/**
 * 记录测试日志到文件。
 *
 * @param fileBaseName 文件名基础（不含扩展名）
 * @param section 日志分区标题
 * @param content 日志内容
 */
export function logTest(fileBaseName: string, section: string, content: string): void {
  const dir = getLogDir()
  const safeName = fileBaseName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filePath = join(dir, `${safeName}.md`)
  const timestamp = new Date().toLocaleTimeString('zh-CN')

  const entry = `### [${timestamp}] ${section}\n\n${content}\n\n---\n\n`
  appendFileSync(filePath, entry)
}
