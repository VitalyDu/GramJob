import { SUBSCRIPTION_PLANS_SEED } from '../../src/scripts/seed-subscription-plans'
import { VACANCY_PACKAGES_SEED, APPLY_PACKAGES_SEED } from '../../src/scripts/seed-packages'

describe('SUBSCRIPTION_PLANS_SEED', () => {
  it('содержит 4 плана: free, pro, max, vip', () => {
    const codes = SUBSCRIPTION_PLANS_SEED.map((p) => p.code)
    expect(codes).toEqual(['free', 'pro', 'max', 'vip'])
  })

  it('free план бесплатный (starsPrice null)', () => {
    const free = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'free')!
    expect(free.starsPrice).toBeNull()
  })

  it('pro план стоит 299 Stars', () => {
    const pro = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'pro')!
    expect(pro.starsPrice).toBe(299)
  })

  it('max план стоит 999 Stars', () => {
    const max = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'max')!
    expect(max.starsPrice).toBe(999)
  })

  it('vip план стоит 499 Stars (надстройка над max)', () => {
    const vip = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'vip')!
    expect(vip.starsPrice).toBe(499)
  })

  it('max и vip имеют доступ к базе резюме', () => {
    const max = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'max')!
    const vip = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'vip')!
    expect(max.resumeDatabaseAccess).toBe(true)
    expect(vip.resumeDatabaseAccess).toBe(true)
  })

  it('free имеет лимит 3 вакансий в месяц', () => {
    const free = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'free')!
    expect(free.vacanciesPerMonth).toBe(3)
  })
})

describe('VACANCY_PACKAGES_SEED', () => {
  it('содержит 4 пакета', () => {
    expect(VACANCY_PACKAGES_SEED).toHaveLength(4)
  })

  it('стоимость пакетов возрастает', () => {
    const prices = VACANCY_PACKAGES_SEED.map((p) => p.starsPrice)
    expect(prices).toEqual([199, 349, 749, 1299])
  })
})

describe('APPLY_PACKAGES_SEED', () => {
  it('содержит 3 пакета', () => {
    expect(APPLY_PACKAGES_SEED).toHaveLength(3)
  })

  it('стоимость пакетов возрастает', () => {
    const prices = APPLY_PACKAGES_SEED.map((p) => p.starsPrice)
    expect(prices).toEqual([149, 249, 999])
  })
})
