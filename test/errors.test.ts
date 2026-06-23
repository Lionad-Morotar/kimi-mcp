import { describe, it, expect } from 'vitest'
import { KimiCliError, isVersionIncompatible } from '../src/cli/errors'

describe('isVersionIncompatible', () => {
  it('INCOMPATIBLE 错误返回 true', () => {
    expect(isVersionIncompatible(new KimiCliError('版本不兼容', 'INCOMPATIBLE'))).toBe(true)
  })

  it('其他 code 错误返回 false', () => {
    expect(isVersionIncompatible(new KimiCliError('x', 'TIMEOUT'))).toBe(false)
    expect(isVersionIncompatible(new KimiCliError('x', 'NOT_FOUND'))).toBe(false)
    expect(isVersionIncompatible(new KimiCliError('x', 'EXEC'))).toBe(false)
  })

  it('非 KimiCliError 返回 false', () => {
    expect(isVersionIncompatible(new Error('普通错误'))).toBe(false)
    expect(isVersionIncompatible('字符串')).toBe(false)
    expect(isVersionIncompatible(null)).toBe(false)
  })
})
