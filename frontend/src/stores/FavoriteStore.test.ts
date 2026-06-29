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
      delete: vi.fn(),
    },
    ApiClientError,
  }
})

import { api, ApiClientError } from '@/services/api'
import { FavoriteStore } from './FavoriteStore'

const mockVacancyEntity = {
  documentId: 'vac456',
  title: 'Senior Developer',
  country: 'RU',
  workFormat: 'remote' as const,
  employmentType: 'full-time' as const,
  seniority: 'senior' as const,
  urgent: false,
  topPlacement: false,
  highlighted: false,
  sourceType: 'internal' as const,
  status: 'published' as const,
  createdAt: '2026-01-01T00:00:00Z',
  company: { documentId: 'comp1', name: 'Test Co', slug: 'test-co' },
}

const mockFavorite = {
  documentId: 'fav123',
  type: 'vacancy' as const,
  targetId: 'vac456',
  entity: mockVacancyEntity,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockFavorite],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('FavoriteStore', () => {
  let store: FavoriteStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new FavoriteStore()
  })

  describe('fetchFavorites', () => {
    it('fetches favorites and updates state', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchFavorites()
      expect(store.favorites).toHaveLength(1)
      expect(store.favorites[0]?.documentId).toBe('fav123')
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('passes type filter to API URL', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })
      await store.fetchFavorites('vacancy')
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('type=vacancy')
    })

    it('does not include type in URL when not provided', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })
      await store.fetchFavorites()
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).not.toContain('type=')
    })

    it('sets error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchFavorites()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('addFavorite', () => {
    it('calls POST /favorites successfully', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockFavorite })
      await store.addFavorite({ type: 'vacancy', targetId: 'vac456' })
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/favorites', {
        type: 'vacancy',
        targetId: 'vac456',
      })
      expect(store.alreadyFavorited).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('sets alreadyFavorited on ALREADY_FAVORITED code', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(409, { error: { code: 'ALREADY_FAVORITED' } }, 'Already favorited')
      )
      await store.addFavorite({ type: 'vacancy', targetId: 'vac456' })
      expect(store.alreadyFavorited).toBe(true)
      expect(store.error).toBeNull()
    })

    it('sets error and rethrows on other failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'))
      await expect(store.addFavorite({ type: 'vacancy', targetId: 'vac456' })).rejects.toThrow(
        'Server error'
      )
      expect(store.error).toBe('Server error')
    })
  })

  describe('removeFavorite', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchFavorites()
    })

    it('calls DELETE and removes from list', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined)
      await store.removeFavorite('vacancy', 'vac456')
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/favorites/vacancy/vac456')
      expect(store.favorites).toHaveLength(0)
    })

    it('sets error and rethrows on failure', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Not found'))
      await expect(store.removeFavorite('vacancy', 'vac456')).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
      expect(store.favorites).toHaveLength(1)
    })
  })

  describe('clearFlags', () => {
    it('resets alreadyFavorited to false', () => {
      store.alreadyFavorited = true
      store.clearFlags()
      expect(store.alreadyFavorited).toBe(false)
    })
  })

  describe('pageCount', () => {
    it('computes pageCount from total and pageSize', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 45, page: 1, pageSize: 20, pageCount: 3 },
      })
      await store.fetchFavorites()
      expect(store.pageCount).toBe(3)
    })
  })
})
