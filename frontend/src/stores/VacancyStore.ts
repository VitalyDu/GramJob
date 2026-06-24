import { makeAutoObservable, runInAction } from 'mobx'
import type {
  Vacancy,
  VacancyListParams,
  VacancyCreateInput,
  VacancyUpdateInput,
} from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type VacancyListMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export class VacancyStore {
  vacancies: Vacancy[] = []
  myVacancies: Vacancy[] = []
  currentVacancy: Vacancy | null = null
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  limitReached = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchVacancies(params: VacancyListParams = {}): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const query = new URLSearchParams()
      const entries = Object.entries(params) as [string, string | number | boolean | undefined][]
      for (const [key, value] of entries) {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value))
        }
      }
      const qs = query.toString()
      const res = await api.get<{ data: Vacancy[]; meta: VacancyListMeta }>(
        `/vacancies${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.vacancies = res.data
        this.total = res.meta.total
        this.page = res.meta.page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyVacancies(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Vacancy[]; meta: VacancyListMeta }>(
        `/vacancies/my?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.myVacancies = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch my vacancies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchVacancyById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentVacancy = null
    })
    try {
      const res = await api.get<{ data: Vacancy }>(`/vacancies/${id}`)
      runInAction(() => {
        this.currentVacancy = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createVacancy(data: VacancyCreateInput): Promise<Vacancy> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Vacancy }>('/vacancies', data)
      runInAction(() => {
        this.myVacancies.unshift(res.data)
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateVacancy(id: string, data: VacancyUpdateInput): Promise<Vacancy> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.put<{ data: Vacancy }>(`/vacancies/${id}`, data)
      runInAction(() => {
        const idx = this.myVacancies.findIndex((v) => v.documentId === id)
        if (idx !== -1) this.myVacancies[idx] = res.data
        if (this.currentVacancy?.documentId === id) this.currentVacancy = res.data
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async deleteVacancy(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/vacancies/${id}`)
      runInAction(() => {
        this.myVacancies = this.myVacancies.filter((v) => v.documentId !== id)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to delete vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async publishVacancy(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Vacancy }>(`/vacancies/${id}/publish`, {})
      runInAction(() => {
        const idx = this.myVacancies.findIndex((v) => v.documentId === id)
        if (idx !== -1) this.myVacancies[idx] = res.data
      })
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } } | null
        if (body?.error?.code === 'LIMIT_REACHED') {
          runInAction(() => {
            this.limitReached = true
          })
          return
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to publish vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async archiveVacancy(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Vacancy }>(`/vacancies/${id}/archive`, {})
      runInAction(() => {
        const idx = this.myVacancies.findIndex((v) => v.documentId === id)
        if (idx !== -1) this.myVacancies[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to archive vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async boostVacancy(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Vacancy }>(`/vacancies/${id}/boost`, {})
      runInAction(() => {
        const idx = this.myVacancies.findIndex((v) => v.documentId === id)
        if (idx !== -1) this.myVacancies[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to boost vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearLimitReached(): void {
    this.limitReached = false
  }
}
