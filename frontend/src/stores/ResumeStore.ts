import { makeAutoObservable, runInAction } from 'mobx'
import type { Resume, ResumeListParams, ResumeCreateInput, ResumeUpdateInput } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type ResumeMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export class ResumeStore {
  resumes: Resume[] = []
  myResumes: Resume[] = []
  currentResume: Resume | null = null
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  accessDenied = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchResumes(params: ResumeListParams = {}): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.accessDenied = false
    })
    try {
      const query = new URLSearchParams()
      const entries = Object.entries(params) as [string, string | number | undefined][]
      for (const [key, value] of entries) {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value))
        }
      }
      const qs = query.toString()
      const res = await api.get<{ data: Resume[]; meta: ResumeMeta }>(
        `/resumes${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.resumes = res.data
        this.total = res.meta.total
        this.page = res.meta.page
      })
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 403) {
        runInAction(() => {
          this.accessDenied = true
        })
        return
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch resumes'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyResumes(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Resume[]; meta: ResumeMeta }>(
        `/resumes/my?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.myResumes = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch my resumes'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchResumeById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentResume = null
    })
    try {
      const res = await api.get<{ data: Resume }>(`/resumes/${id}`)
      runInAction(() => {
        this.currentResume = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch resume'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createResume(data: ResumeCreateInput): Promise<Resume> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Resume }>('/resumes', data)
      runInAction(() => {
        this.myResumes.unshift(res.data)
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateResume(id: string, data: ResumeUpdateInput): Promise<Resume> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.put<{ data: Resume }>(`/resumes/${id}`, data)
      runInAction(() => {
        const idx = this.myResumes.findIndex((r) => r.documentId === id)
        if (idx !== -1) this.myResumes[idx] = res.data
        if (this.currentResume?.documentId === id) this.currentResume = res.data
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async publishResume(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Resume }>(`/resumes/${id}/publish`, {})
      runInAction(() => {
        const idx = this.myResumes.findIndex((r) => r.documentId === id)
        if (idx !== -1) this.myResumes[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to publish resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async archiveResume(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.delete<{ data: Resume }>(`/resumes/${id}`)
      runInAction(() => {
        const idx = this.myResumes.findIndex((r) => r.documentId === id)
        if (idx !== -1) this.myResumes[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to archive resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearAccessDenied(): void {
    this.accessDenied = false
  }
}
