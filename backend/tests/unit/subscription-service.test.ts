import {
  calculateExpiresAt,
  buildUserUpdateData,
  CREDIT_FIELD_MAP,
  activateSubscription,
  resolveSubscriptionStart,
} from '../../src/api/payment/services/subscription-service'

describe('calculateExpiresAt', () => {
  it('добавляет durationDays дней к текущей дате', () => {
    const now = new Date('2026-06-30T12:00:00Z')
    const result = calculateExpiresAt(30, now)
    expect(result).toBe('2026-07-30T12:00:00.000Z')
  })

  it('работает с 1 днём', () => {
    const now = new Date('2026-06-30T00:00:00Z')
    const result = calculateExpiresAt(1, now)
    expect(result).toBe('2026-07-01T00:00:00.000Z')
  })
})

describe('buildUserUpdateData', () => {
  it('для vip плана устанавливает isVip=true', () => {
    const expiresAt = '2026-07-30T12:00:00.000Z'
    const data = buildUserUpdateData('vip', expiresAt)
    expect(data.subscriptionPlan).toBe('vip')
    expect(data.subscriptionExpiresAt).toBe(expiresAt)
    expect(data.isVip).toBe(true)
  })

  it('для non-vip плана устанавливает isVip=false', () => {
    const expiresAt = '2026-07-30T12:00:00.000Z'
    const data = buildUserUpdateData('pro', expiresAt)
    expect(data.subscriptionPlan).toBe('pro')
    expect(data.isVip).toBe(false)
  })

  it('для free плана устанавливает isVip=false', () => {
    const data = buildUserUpdateData('free', '2026-07-30T00:00:00.000Z')
    expect(data.isVip).toBe(false)
  })
})

describe('CREDIT_FIELD_MAP', () => {
  it('vacancy → vacancyCredits', () => {
    expect(CREDIT_FIELD_MAP.vacancy).toBe('vacancyCredits')
  })

  it('apply → applyCredits', () => {
    expect(CREDIT_FIELD_MAP.apply).toBe('applyCredits')
  })
})

describe('resolveSubscriptionStart — VIP upgrade from Max', () => {
  it('S1: при покупке VIP с активным Max — стартует с конца Max-подписки', () => {
    const now = new Date('2026-07-23T12:00:00Z')
    const maxExpiresAt = '2026-07-31T12:00:00.000Z'
    const result = resolveSubscriptionStart('vip', 'max', maxExpiresAt, now)
    expect(result.toISOString()).toBe(maxExpiresAt)
  })

  it('S1: при покупке VIP с просроченным Max — стартует от сейчас', () => {
    const now = new Date('2026-08-05T12:00:00Z')
    const maxExpiresAt = '2026-07-31T12:00:00.000Z' // already expired
    const result = resolveSubscriptionStart('vip', 'max', maxExpiresAt, now)
    expect(result).toBe(now)
  })

  it('S1: VIP продление расширяется от текущего окончания', () => {
    const now = new Date('2026-07-23T12:00:00Z')
    const vipExpiresAt = '2026-08-10T12:00:00.000Z'
    const result = resolveSubscriptionStart('vip', 'vip', vipExpiresAt, now)
    expect(result.toISOString()).toBe(vipExpiresAt)
  })

  it('Pro→Pro renewal extends from existing expiry', () => {
    const now = new Date('2026-07-23T12:00:00Z')
    const expiresAt = '2026-07-30T12:00:00.000Z'
    const result = resolveSubscriptionStart('pro', 'pro', expiresAt, now)
    expect(result.toISOString()).toBe(expiresAt)
  })
})

describe('activateSubscription — VIP retroactive highlighting', () => {
  function makeVipStrapi(publishedVacancyCount = 2) {
    const rawSql = jest.fn().mockResolvedValue({ rowCount: publishedVacancyCount })
    return {
      db: {
        query: jest.fn().mockReturnValue({
          findOne: jest
            .fn()
            .mockResolvedValue({ subscriptionPlan: 'max', subscriptionExpiresAt: null }),
          update: jest.fn().mockResolvedValue({}),
        }),
        connection: { raw: rawSql },
      },
      documents: jest.fn().mockReturnValue({
        findFirst: jest.fn().mockResolvedValue({ durationDays: 30 }),
        updateMany: jest.fn().mockResolvedValue([]),
      }),
      log: { info: jest.fn() },
      _rawSql: rawSql,
    } as any
  }

  it('при активации VIP обновляет published вакансии пользователя — highlighted=true', async () => {
    const strapi = makeVipStrapi()
    await activateSubscription(strapi, 42, 'vip')
    const rawCalls = strapi._rawSql.mock.calls as Array<[string, unknown[]]>
    const highlightCall = rawCalls.find(([sql]) => sql.includes('highlighted'))
    expect(highlightCall).toBeDefined()
    expect(highlightCall![1]).toContain(42)
  })

  it('при активации pro НЕ обновляет вакансии', async () => {
    const strapi = makeVipStrapi()
    await activateSubscription(strapi, 42, 'pro')
    const rawCalls = strapi._rawSql.mock.calls as Array<[string, unknown[]]>
    const highlightCall = rawCalls.find(([sql]) => sql.includes('highlighted'))
    expect(highlightCall).toBeUndefined()
  })
})
