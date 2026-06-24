import { checkIsOwner } from '../../src/api/company/policies/is-company-owner'

describe('checkIsOwner', () => {
  it('returns true when userId matches company owner id', () => {
    expect(checkIsOwner({ owner: { id: 42 } }, 42)).toBe(true)
  })

  it('returns false when userId does not match owner', () => {
    expect(checkIsOwner({ owner: { id: 42 } }, 99)).toBe(false)
  })

  it('returns false when company has no owner', () => {
    expect(checkIsOwner({ owner: null }, 42)).toBe(false)
  })
})
