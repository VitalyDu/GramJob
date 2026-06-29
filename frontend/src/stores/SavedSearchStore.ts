import { makeAutoObservable, runInAction } from 'mobx'
import type { SavedSearch, SavedSearchCreateInput } from '@/types/api'
import { api } from '@/services/api'

type SearchMeta = { total: number; page: number; pageSize: number; pageCount: number }

export class SavedSearchStore {
  searches: SavedSearch[] = []
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

  async fetchSavedSearches(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: SavedSearch[]; meta: SearchMeta }>(
        `/saved-searches?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.searches = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch saved searches'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createSavedSearch(input: SavedSearchCreateInput): Promise<SavedSearch> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: SavedSearch }>('/saved-searches', input)
      runInAction(() => {
        this.searches.unshift(res.data)
        this.total += 1
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to save search'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async removeSavedSearch(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/saved-searches/${id}`)
      runInAction(() => {
        this.searches = this.searches.filter((s) => s.documentId !== id)
        this.total = Math.max(0, this.total - 1)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to remove saved search'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}
