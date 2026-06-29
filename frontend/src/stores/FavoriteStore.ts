import { makeAutoObservable, runInAction } from 'mobx'
import type { Favorite, FavoriteCreateInput, FavoriteType } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type FavMeta = { total: number; page: number; pageSize: number; pageCount: number }

export class FavoriteStore {
  favorites: Favorite[] = []
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  alreadyFavorited = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchFavorites(type?: FavoriteType, page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(this.pageSize) })
      if (type) params.set('type', type)
      const res = await api.get<{ data: Favorite[]; meta: FavMeta }>(`/favorites?${params}`)
      runInAction(() => {
        this.favorites = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch favorites'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async addFavorite(input: FavoriteCreateInput): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.alreadyFavorited = false
    })
    try {
      await api.post<{ data: Favorite }>('/favorites', input)
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } } | null
        if (body?.error?.code === 'ALREADY_FAVORITED') {
          runInAction(() => {
            this.alreadyFavorited = true
          })
          return
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to add favorite'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async removeFavorite(type: FavoriteType, targetId: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/favorites/${type}/${targetId}`)
      runInAction(() => {
        this.favorites = this.favorites.filter((f) => !(f.type === type && f.targetId === targetId))
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to remove favorite'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearFlags(): void {
    this.alreadyFavorited = false
  }
}
