import { checkIsMaxPlan } from '../../src/api/resume/policies/requires-max-plan'

describe('checkIsMaxPlan', () => {
  it('returns true for max plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'max' })).toBe(true)
  })

  it('returns false for free plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'free' })).toBe(false)
  })

  it('returns false for pro plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'pro' })).toBe(false)
  })

  it('returns true for vip plan (vip includes max features)', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'vip' })).toBe(true)
  })

  it('returns false for unknown plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'unknown' })).toBe(false)
  })
})
