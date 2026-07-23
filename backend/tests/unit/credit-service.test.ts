import {
  getLimitForPlan,
  getBoostsLimitForPlan,
  PLAN_LIMITS,
  checkAndConsumeVacancyCredit,
  refundVacancyCredit,
  checkAndConsumeBoost,
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

// Helpers to build mock strapi instances for checkAndConsumeVacancyCredit / refundVacancyCredit

function makeMockStrapi({
  subscriptionPlan = 'free',
  rawRowCount = 0,
  vacancyCount = 0,
}: {
  subscriptionPlan?: string
  rawRowCount?: number
  vacancyCount?: number
}) {
  const rawSql = jest.fn().mockResolvedValue({ rowCount: rawRowCount })
  const countMock = jest.fn().mockResolvedValue(vacancyCount)
  return {
    db: {
      query: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ subscriptionPlan }),
      }),
      connection: { raw: rawSql },
    },
    documents: jest.fn().mockReturnValue({
      count: countMock,
    }),
    _rawSql: rawSql,
    _countMock: countMock,
  } as any
}

describe('checkAndConsumeVacancyCredit', () => {
  it('returns { source: "package" } when package credit is consumed (rowCount=1)', async () => {
    const strapi = makeMockStrapi({ subscriptionPlan: 'free', rawRowCount: 1, vacancyCount: 0 })
    const result = await checkAndConsumeVacancyCredit(strapi, 1)
    expect(result).toEqual({ source: 'package' })
    expect(strapi._rawSql).toHaveBeenCalledWith(
      expect.stringContaining('vacancy_credits = vacancy_credits - 1'),
      [1]
    )
  })

  it('returns { source: "plan" } when under plan limit and no package credits (rowCount=0)', async () => {
    // free plan limit is 3, vacancyCount=1 (under limit)
    const strapi = makeMockStrapi({ subscriptionPlan: 'free', rawRowCount: 0, vacancyCount: 1 })
    const result = await checkAndConsumeVacancyCredit(strapi, 2)
    expect(result).toEqual({ source: 'plan' })
  })

  it('throws LIMIT_REACHED when plan limit is exhausted', async () => {
    // free plan limit is 3, vacancyCount=3 (at limit)
    const strapi = makeMockStrapi({ subscriptionPlan: 'free', rawRowCount: 0, vacancyCount: 3 })
    await expect(checkAndConsumeVacancyCredit(strapi, 3)).rejects.toMatchObject({
      code: 'LIMIT_REACHED',
      details: { limit: 3, used: 3 },
    })
  })

  it('throws LIMIT_REACHED when pro plan limit is exhausted', async () => {
    const strapi = makeMockStrapi({ subscriptionPlan: 'pro', rawRowCount: 0, vacancyCount: 10 })
    await expect(checkAndConsumeVacancyCredit(strapi, 4)).rejects.toMatchObject({
      code: 'LIMIT_REACHED',
      details: { limit: 10, used: 10 },
    })
  })

  it('не фильтрует по createdAt — все активные вакансии (любого месяца) считаются против лимита', async () => {
    // H1+M1: vacancies from previous months must count against the active limit
    const strapi = makeMockStrapi({ subscriptionPlan: 'free', rawRowCount: 0, vacancyCount: 0 })
    await checkAndConsumeVacancyCredit(strapi, 1)
    const [countOptions] = strapi._countMock.mock.calls[0]
    expect(countOptions?.filters?.createdAt).toBeUndefined()
  })
})

describe('checkAndConsumeBoost — package users', () => {
  function makeMockBoostStrapi({
    subscriptionPlan = 'free',
    packageBoostRowCount = 0,
    remainingBoostCredits = 0,
    dailyUsed = 0,
    dailyLimit = 3,
  }: {
    subscriptionPlan?: string
    packageBoostRowCount?: number
    remainingBoostCredits?: number
    dailyUsed?: number
    dailyLimit?: number
  }) {
    const rawSql = jest.fn()
    rawSql
      .mockResolvedValueOnce({
        rowCount: packageBoostRowCount,
        rows: [{ boost_credits: remainingBoostCredits }],
      })
      .mockResolvedValue({ rows: [{ new_count: dailyUsed + 1 }] })

    return {
      db: {
        query: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({ subscriptionPlan }),
        }),
        connection: { raw: rawSql },
      },
      documents: jest.fn().mockReturnValue({
        count: jest.fn().mockResolvedValue(dailyUsed),
      }),
      _rawSql: rawSql,
    } as any
  }

  it('возвращает оставшиеся boost_credits из пакета (не limit - dailyUsed) когда source=package', async () => {
    // M6: package user has 5 boost_credits; after consuming 1, remaining should be 4 (not plan daily limit)
    const strapi = makeMockBoostStrapi({
      subscriptionPlan: 'free',
      packageBoostRowCount: 1,
      remainingBoostCredits: 4,
    })
    const result = await checkAndConsumeBoost(strapi, 1)
    expect(result.source).toBe('package')
    expect(result.boostsRemaining).toBe(4)
  })
})

describe('refundVacancyCredit', () => {
  it('issues an atomic increment SQL with the correct userId', async () => {
    const rawSql = jest.fn().mockResolvedValue({})
    const strapi = {
      db: { connection: { raw: rawSql } },
    } as any

    await refundVacancyCredit(strapi, 42)

    expect(rawSql).toHaveBeenCalledTimes(1)
    expect(rawSql).toHaveBeenCalledWith(
      expect.stringContaining('vacancy_credits = vacancy_credits + 1'),
      [42]
    )
  })
})
