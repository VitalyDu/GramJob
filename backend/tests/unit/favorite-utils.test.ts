import { isValidFavoriteType } from '../../src/api/favorite/services/favorite-utils'

describe('isValidFavoriteType', () => {
  it('returns true for vacancy', () => {
    expect(isValidFavoriteType('vacancy')).toBe(true)
  })

  it('returns true for resume', () => {
    expect(isValidFavoriteType('resume')).toBe(true)
  })

  it('returns true for company', () => {
    expect(isValidFavoriteType('company')).toBe(true)
  })

  it('returns false for unknown type', () => {
    expect(isValidFavoriteType('application')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidFavoriteType('')).toBe(false)
  })
})
