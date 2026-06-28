import { makeAutoObservable, runInAction } from 'mobx'
import type { Application, ApplicationCreateInput } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type AppMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export class ApplicationStore {
  applications: Application[] = []
  vacancyApplications: Application[] = []
  isLoading = false
  error: string | null = null
  // candidate view pagination
  total = 0
  page = 1
  pageSize = 20
  // employer view pagination (separate to avoid overwriting candidate state)
  vacancyTotal = 0
  vacancyPage = 1
  limitReached = false
  alreadyApplied = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  get vacancyPageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.vacancyTotal / this.pageSize) : 0
  }

  async createApplication(data: ApplicationCreateInput): Promise<Application> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.limitReached = false
      this.alreadyApplied = false
    })
    try {
      const res = await api.post<{ data: Application }>('/applications', data)
      runInAction(() => {
        this.applications.unshift(res.data)
      })
      return res.data
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } } | null
        if (body?.error?.code === 'LIMIT_REACHED') {
          runInAction(() => {
            this.limitReached = true
          })
          throw e
        }
        if (body?.error?.code === 'ALREADY_APPLIED') {
          runInAction(() => {
            this.alreadyApplied = true
          })
          throw e
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create application'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyApplications(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Application[]; meta: AppMeta }>(
        `/applications?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.applications = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch applications'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchVacancyApplications(vacancyId: string, page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Application[]; meta: AppMeta }>(
        `/vacancies/${vacancyId}/applications?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.vacancyApplications = res.data
        this.vacancyTotal = res.meta.total
        this.vacancyPage = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy applications'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateApplicationStatus(id: string, status: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.patch<{ data: Application }>(`/applications/${id}`, { status })
      runInAction(() => {
        const vIdx = this.vacancyApplications.findIndex((a) => a.documentId === id)
        if (vIdx !== -1) this.vacancyApplications[vIdx] = res.data
        const mIdx = this.applications.findIndex((a) => a.documentId === id)
        if (mIdx !== -1) this.applications[mIdx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update status'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearFlags(): void {
    this.limitReached = false
    this.alreadyApplied = false
  }
}
