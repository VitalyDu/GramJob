import { makeAutoObservable, runInAction } from 'mobx'
import type {
  Company,
  CompanyListParams,
  CompanyCreateInput,
  CompanyUpdateInput,
} from '@/types/api'
import { api } from '@/services/api'

type CompanyListMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export class CompanyStore {
  companies: Company[] = []
  myCompanies: Company[] = []
  currentCompany: Company | null = null
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchCompanies(params: CompanyListParams = {}): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const query = new URLSearchParams()
      if (params.search) query.set('search', params.search)
      if (params.country) query.set('country', params.country)
      if (params.companySize) query.set('companySize', params.companySize)
      if (params.page) query.set('page', String(params.page))
      if (params.pageSize) query.set('pageSize', String(params.pageSize))

      const qs = query.toString()
      const res = await api.get<{ data: Company[]; meta: CompanyListMeta }>(
        `/companies${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.companies = res.data
        this.total = res.meta.total
        this.page = res.meta.page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch companies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyCompanies(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Company[]; meta: CompanyListMeta }>(
        `/companies/my?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.myCompanies = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch my companies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchCompanyById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentCompany = null
    })
    try {
      const res = await api.get<{ data: Company }>(`/companies/${id}`)
      runInAction(() => {
        this.currentCompany = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch company'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyCompanyById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentCompany = null
    })
    try {
      const res = await api.get<{ data: Company }>(`/companies/my/${id}`)
      runInAction(() => {
        this.currentCompany = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch company'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createCompany(data: CompanyCreateInput): Promise<Company> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Company }>('/companies', data)
      runInAction(() => {
        this.myCompanies.unshift(res.data)
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateCompany(id: string, data: CompanyUpdateInput): Promise<Company> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.put<{ data: Company }>(`/companies/${id}`, data)
      runInAction(() => {
        const idx = this.myCompanies.findIndex((c) => c.documentId === id)
        if (idx !== -1) this.myCompanies[idx] = res.data
        if (this.currentCompany?.documentId === id) this.currentCompany = res.data
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async deleteCompany(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/companies/${id}`)
      runInAction(() => {
        this.myCompanies = this.myCompanies.filter((c) => c.documentId !== id)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to delete company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async submitCompany(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Company }>(`/companies/${id}/submit`, {})
      runInAction(() => {
        const idx = this.myCompanies.findIndex((c) => c.documentId === id)
        if (idx !== -1) this.myCompanies[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to submit company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}
