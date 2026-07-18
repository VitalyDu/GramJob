import { makeAutoObservable, runInAction } from 'mobx'
import type {
  VacancyAnalyticsResponse,
  ResumeAnalyticsResponse,
  CompanyAnalyticsResponse,
} from '@/types/api'
import { api } from '@/services/api'

export class AnalyticsStore {
  vacancyAnalytics: VacancyAnalyticsResponse | null = null
  resumeAnalytics: ResumeAnalyticsResponse | null = null
  companyAnalytics: CompanyAnalyticsResponse | null = null
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchVacancyAnalytics(documentId: string, from?: string, to?: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.vacancyAnalytics = null
    })
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString()

      const res = await api.get<VacancyAnalyticsResponse>(
        `/analytics/vacancies/${documentId}${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.vacancyAnalytics = res
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy analytics'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchCompanyAnalytics(documentId: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.companyAnalytics = null
    })
    try {
      const res = await api.get<CompanyAnalyticsResponse>(`/analytics/companies/${documentId}`)
      runInAction(() => {
        this.companyAnalytics = res
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch company analytics'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchResumeAnalytics(documentId: string, from?: string, to?: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.resumeAnalytics = null
    })
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString()

      const res = await api.get<ResumeAnalyticsResponse>(
        `/analytics/resumes/${documentId}${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.resumeAnalytics = res
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch resume analytics'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}
