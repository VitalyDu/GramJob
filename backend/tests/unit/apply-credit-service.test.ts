import {
  APPLY_PLAN_LIMITS,
  getApplyLimitForPlan,
  getAppliesUsedToday,
  incrementApplyCount,
} from '../../src/api/application/services/apply-credit-service'

describe('getApplyLimitForPlan', () => {
  it('returns 3 for free plan', () => {
    expect(getApplyLimitForPlan('free')).toBe(3)
  })

  it('returns 10 for pro plan', () => {
    expect(getApplyLimitForPlan('pro')).toBe(10)
  })

  it('returns 50 for max plan', () => {
    expect(getApplyLimitForPlan('max')).toBe(50)
  })

  it('returns 3 for unknown plan (defaults to free)', () => {
    expect(getApplyLimitForPlan('unknown')).toBe(3)
  })
})

describe('APPLY_PLAN_LIMITS', () => {
  it('has entries for free, pro, max', () => {
    expect(APPLY_PLAN_LIMITS).toHaveProperty('free')
    expect(APPLY_PLAN_LIMITS).toHaveProperty('pro')
    expect(APPLY_PLAN_LIMITS).toHaveProperty('max')
  })
})

describe('getAppliesUsedToday / incrementApplyCount', () => {
  it('returns 0 for user with no applies today', () => {
    expect(getAppliesUsedToday(9001)).toBe(0)
  })

  it('increments count after apply', () => {
    const userId = 9002
    expect(getAppliesUsedToday(userId)).toBe(0)
    incrementApplyCount(userId)
    expect(getAppliesUsedToday(userId)).toBe(1)
    incrementApplyCount(userId)
    expect(getAppliesUsedToday(userId)).toBe(2)
  })
})
