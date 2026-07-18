import {
  APPLY_PLAN_LIMITS,
  getApplyLimitForPlan,
  getAppliesUsedToday,
} from '../../src/api/application/services/apply-credit-service'

describe('getApplyLimitForPlan (fallback)', () => {
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

describe('getAppliesUsedToday (DB-backed)', () => {
  it('reads count from up_users via SQL', async () => {
    const raw = jest.fn().mockResolvedValueOnce({ rows: [{ count: 5 }] })
    const strapi = { db: { connection: { raw } } } as any
    expect(await getAppliesUsedToday(strapi, 9001)).toBe(5)
    expect(raw).toHaveBeenCalledTimes(1)
    expect(raw.mock.calls[0][0]).toContain('daily_apply_count')
  })

  it('returns 0 when user has no row', async () => {
    const raw = jest.fn().mockResolvedValueOnce({ rows: [] })
    const strapi = { db: { connection: { raw } } } as any
    expect(await getAppliesUsedToday(strapi, 9002)).toBe(0)
  })
})
