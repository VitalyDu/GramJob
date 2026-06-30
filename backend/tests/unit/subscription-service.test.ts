import {
  calculateExpiresAt,
  buildUserUpdateData,
  CREDIT_FIELD_MAP,
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
