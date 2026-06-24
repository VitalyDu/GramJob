import {
  getLimitForPlan,
  getBoostsLimitForPlan,
  PLAN_LIMITS,
} from '../../src/api/vacancy/services/credit-service'

describe('getLimitForPlan', () => {
  it('returns 3 for free plan', () => {
    expect(getLimitForPlan('free')).toBe(3)
  })

  it('returns 10 for pro plan', () => {
    expect(getLimitForPlan('pro')).toBe(10)
  })

  it('returns 50 for max plan', () => {
    expect(getLimitForPlan('max')).toBe(50)
  })

  it('returns 3 for unknown plan (defaults to free)', () => {
    expect(getLimitForPlan('unknown')).toBe(3)
  })
})

describe('getBoostsLimitForPlan', () => {
  it('returns 3 for free plan', () => {
    expect(getBoostsLimitForPlan('free')).toBe(3)
  })

  it('returns 10 for pro plan', () => {
    expect(getBoostsLimitForPlan('pro')).toBe(10)
  })

  it('returns 50 for max plan', () => {
    expect(getBoostsLimitForPlan('max')).toBe(50)
  })

  it('returns 3 for unknown plan', () => {
    expect(getBoostsLimitForPlan('unknown')).toBe(3)
  })
})

describe('PLAN_LIMITS', () => {
  it('has entries for free, pro, max', () => {
    expect(PLAN_LIMITS).toHaveProperty('free')
    expect(PLAN_LIMITS).toHaveProperty('pro')
    expect(PLAN_LIMITS).toHaveProperty('max')
  })
})
