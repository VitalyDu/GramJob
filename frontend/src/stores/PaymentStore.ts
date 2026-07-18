import { makeAutoObservable, runInAction } from 'mobx'
import type { SubscriptionPlan, VacancyPackage, ApplyPackage } from '@/types/api'
import { api } from '@/services/api'

export class PaymentStore {
  plans: SubscriptionPlan[] = []
  vacancyPackages: VacancyPackage[] = []
  applyPackages: ApplyPackage[] = []
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchPlans(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: SubscriptionPlan[] }>('/subscription-plans')
      runInAction(() => {
        this.plans = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch plans'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchVacancyPackages(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: VacancyPackage[] }>('/vacancy-packages')
      runInAction(() => {
        this.vacancyPackages = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy packages'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchApplyPackages(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: ApplyPackage[] }>('/apply-packages')
      runInAction(() => {
        this.applyPackages = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch apply packages'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async subscribeToPlan(planCode: string): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/subscribe', { planCode })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async buyVacancyPack(packageId: number): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/vacancy-pack', { packageId })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async buyApplyPack(packageId: number): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/apply-pack', { packageId })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async buyUrgent(vacancyId: string): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/urgent', { vacancyId })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async buyTopPlacement(vacancyId: string): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/top-placement', { vacancyId })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearError(): void {
    this.error = null
  }
}

// Одноразовые апгрейды вакансий — цены синхронизированы с backend telegram-bot.ts
export const VACANCY_UPGRADE_PRICES = {
  urgent: 99,
  top_placement: 199,
} as const
