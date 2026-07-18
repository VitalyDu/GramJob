import {
  getPlanLimits,
  FALLBACK_PLAN_LIMITS,
  _resetPlanLimitsCache,
} from '../../src/services/plan-limits'

function makeStrapi(planDoc: Record<string, unknown> | null, throwErr = false) {
  const findFirst = jest.fn(async () => {
    if (throwErr) throw new Error('db down')
    return planDoc
  })
  return {
    documents: jest.fn().mockReturnValue({ findFirst }),
    log: { warn: jest.fn(), error: jest.fn() },
  } as any
}

describe('getPlanLimits', () => {
  beforeEach(() => _resetPlanLimitsCache())

  it('returns limits from DB when plan exists', async () => {
    const strapi = makeStrapi({
      vacanciesPerMonth: 25,
      activeVacanciesLimit: 25,
      vacancyBoostsPerDay: 25,
      applicationsPerDay: 25,
      resumesLimit: 10,
      resumeDatabaseAccess: true,
    })
    const limits = await getPlanLimits(strapi, 'pro')
    expect(limits.vacanciesPerMonth).toBe(25)
    expect(limits.resumeDatabaseAccess).toBe(true)
  })

  it('falls back to hardcoded when plan missing from DB', async () => {
    const strapi = makeStrapi(null)
    const limits = await getPlanLimits(strapi, 'free')
    expect(limits).toEqual(FALLBACK_PLAN_LIMITS.free)
  })

  it('falls back to hardcoded when DB throws', async () => {
    const strapi = makeStrapi(null, true)
    const limits = await getPlanLimits(strapi, 'max')
    expect(limits).toEqual(FALLBACK_PLAN_LIMITS.max)
    expect(strapi.log.warn).toHaveBeenCalled()
  })

  it('falls back to free for unknown plan code', async () => {
    const strapi = makeStrapi(null)
    const limits = await getPlanLimits(strapi, 'nonexistent-plan-code')
    expect(limits).toEqual(FALLBACK_PLAN_LIMITS.free)
  })

  it('caches DB result — second call does not hit DB', async () => {
    const strapi = makeStrapi({ vacanciesPerMonth: 99 })
    await getPlanLimits(strapi, 'pro')
    await getPlanLimits(strapi, 'pro')
    expect(strapi.documents).toHaveBeenCalledTimes(1)
  })

  it('merges partial DB fields with fallback', async () => {
    // DB record has only vacanciesPerMonth — other fields should come from fallback
    const strapi = makeStrapi({ vacanciesPerMonth: 77 })
    const limits = await getPlanLimits(strapi, 'pro')
    expect(limits.vacanciesPerMonth).toBe(77)
    expect(limits.resumesLimit).toBe(FALLBACK_PLAN_LIMITS.pro!.resumesLimit)
  })
})
