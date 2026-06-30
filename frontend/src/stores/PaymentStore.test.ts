import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => {
  class ApiClientError extends Error {
    constructor(
      public status: number,
      public data: unknown,
      message: string
    ) {
      super(message)
      this.name = 'ApiClientError'
    }
  }
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
    ApiClientError,
  }
})

import { api } from '@/services/api'
import { PaymentStore } from './PaymentStore'

const mockPlan = {
  id: 2,
  documentId: 'plan-pro',
  code: 'pro' as const,
  name: 'Pro',
  vacanciesPerMonth: 10,
  activeVacanciesLimit: 10,
  vacancyBoostsPerDay: 10,
  applicationsPerDay: 10,
  resumesLimit: 5,
  resumeDatabaseAccess: false,
  starsPrice: 299,
  durationDays: 30,
}

const mockVacancyPack = {
  id: 1,
  documentId: 'vpack-1',
  name: 'Starter',
  vacancyCredits: 10,
  boostCredits: 10,
  starsPrice: 199,
}

const mockApplyPack = {
  id: 1,
  documentId: 'apack-1',
  name: 'Starter',
  applyCredits: 50,
  starsPrice: 149,
}

describe('PaymentStore', () => {
  let store: PaymentStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new PaymentStore()
  })

  describe('fetchPlans', () => {
    it('загружает планы и сбрасывает isLoading', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockPlan] })
      await store.fetchPlans()
      expect(store.plans).toHaveLength(1)
      expect(store.plans[0]?.code).toBe('pro')
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('вызывает GET /subscription-plans', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] })
      await store.fetchPlans()
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/subscription-plans')
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchPlans()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('fetchVacancyPackages', () => {
    it('загружает пакеты вакансий', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockVacancyPack] })
      await store.fetchVacancyPackages()
      expect(store.vacancyPackages).toHaveLength(1)
      expect(store.vacancyPackages[0]?.starsPrice).toBe(199)
      expect(store.isLoading).toBe(false)
    })

    it('вызывает GET /vacancy-packages', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] })
      await store.fetchVacancyPackages()
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/vacancy-packages')
    })
  })

  describe('fetchApplyPackages', () => {
    it('загружает пакеты откликов', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockApplyPack] })
      await store.fetchApplyPackages()
      expect(store.applyPackages).toHaveLength(1)
      expect(store.applyPackages[0]?.applyCredits).toBe(50)
      expect(store.isLoading).toBe(false)
    })

    it('вызывает GET /apply-packages', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] })
      await store.fetchApplyPackages()
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/apply-packages')
    })
  })

  describe('subscribeToPlan', () => {
    it('вызывает POST /payments/subscribe и возвращает invoiceUrl', async () => {
      vi.mocked(api.post).mockResolvedValue({ invoiceUrl: 'https://t.me/invoice/abc' })
      const url = await store.subscribeToPlan('pro')
      expect(url).toBe('https://t.me/invoice/abc')
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/payments/subscribe', { planCode: 'pro' })
      expect(store.isLoading).toBe(false)
    })

    it('устанавливает error и пробрасывает исключение при ошибке', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Forbidden'))
      await expect(store.subscribeToPlan('vip')).rejects.toThrow('Forbidden')
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('buyVacancyPack', () => {
    it('вызывает POST /payments/vacancy-pack и возвращает invoiceUrl', async () => {
      vi.mocked(api.post).mockResolvedValue({ invoiceUrl: 'https://t.me/invoice/vp1' })
      const url = await store.buyVacancyPack(1)
      expect(url).toBe('https://t.me/invoice/vp1')
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/payments/vacancy-pack', { packageId: 1 })
    })

    it('устанавливает error и пробрасывает исключение при ошибке', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Not found'))
      await expect(store.buyVacancyPack(999)).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
    })
  })

  describe('buyApplyPack', () => {
    it('вызывает POST /payments/apply-pack и возвращает invoiceUrl', async () => {
      vi.mocked(api.post).mockResolvedValue({ invoiceUrl: 'https://t.me/invoice/ap1' })
      const url = await store.buyApplyPack(1)
      expect(url).toBe('https://t.me/invoice/ap1')
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/payments/apply-pack', { packageId: 1 })
    })

    it('устанавливает error и пробрасывает исключение при ошибке', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Not found'))
      await expect(store.buyApplyPack(999)).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
    })
  })

  describe('clearError', () => {
    it('сбрасывает error в null', () => {
      store.error = 'some error'
      store.clearError()
      expect(store.error).toBeNull()
    })
  })
})
