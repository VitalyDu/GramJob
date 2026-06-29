import { isValidTargetType } from '../../src/api/block/services/block-utils'

describe('isValidTargetType', () => {
  it('returns true for employer', () => {
    expect(isValidTargetType('employer')).toBe(true)
  })

  it('returns true for candidate', () => {
    expect(isValidTargetType('candidate')).toBe(true)
  })

  it('returns false for unknown type', () => {
    expect(isValidTargetType('admin')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidTargetType('')).toBe(false)
  })

  it('returns false for vacancy (wrong entity type)', () => {
    expect(isValidTargetType('vacancy')).toBe(false)
  })
})
