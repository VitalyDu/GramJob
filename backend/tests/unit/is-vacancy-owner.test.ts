import { checkIsOwner } from '../../src/api/vacancy/policies/is-vacancy-owner'

describe('checkIsOwner (vacancy)', () => {
  it('returns true when userId matches postedBy id', () => {
    expect(checkIsOwner({ postedBy: { id: 42 } }, 42)).toBe(true)
  })

  it('returns false when userId does not match postedBy', () => {
    expect(checkIsOwner({ postedBy: { id: 42 } }, 99)).toBe(false)
  })

  it('returns false when vacancy has no postedBy', () => {
    expect(checkIsOwner({ postedBy: null }, 42)).toBe(false)
  })

  it('returns false when postedBy is undefined', () => {
    expect(checkIsOwner({ postedBy: undefined }, 42)).toBe(false)
  })
})
