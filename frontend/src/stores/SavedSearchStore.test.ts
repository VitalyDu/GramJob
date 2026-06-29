import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/services/api'
import { SavedSearchStore } from './SavedSearchStore'

const mockSearch = {
  documentId: 'ss123',
  name: 'Remote TypeScript jobs',
  type: 'vacancy' as const,
  filters: { workFormat: 'remote', employmentType: 'full-time' },
  lastNotifiedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockSearch],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('SavedSearchStore', () => {
  let store: SavedSearchStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new SavedSearchStore()
  })

  describe('fetchSavedSearches', () => {
    it('fetches and updates state', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches()
      expect(store.searches).toHaveLength(1)
      expect(store.searches[0]?.documentId).toBe('ss123')
      expect(store.total).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('passes page param to API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches(2)
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('page=2')
    })

    it('sets error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchSavedSearches()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createSavedSearch', () => {
    it('creates search, prepends to list, increments total', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches()

      const newSearch = { ...mockSearch, documentId: 'ss999', name: 'New search' }
      vi.mocked(api.post).mockResolvedValue({ data: newSearch })

      const result = await store.createSavedSearch({
        type: 'vacancy',
        filters: { workFormat: 'remote' },
      })
      expect(result.documentId).toBe('ss999')
      expect(store.searches[0]?.documentId).toBe('ss999')
      expect(store.total).toBe(2)
      expect(store.isLoading).toBe(false)
    })

    it('throws and sets error on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'))
      await expect(store.createSavedSearch({ type: 'vacancy', filters: {} })).rejects.toThrow(
        'Server error'
      )
      expect(store.error).toBe('Server error')
    })
  })

  describe('removeSavedSearch', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches()
    })

    it('removes search from list and decrements total', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined)
      await store.removeSavedSearch('ss123')
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/saved-searches/ss123')
      expect(store.searches).toHaveLength(0)
      expect(store.total).toBe(0)
    })

    it('throws and sets error on failure', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Not found'))
      await expect(store.removeSavedSearch('ss123')).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
      expect(store.searches).toHaveLength(1)
    })
  })

  describe('pageCount', () => {
    it('computes pageCount from total and pageSize', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 40, page: 1, pageSize: 20, pageCount: 2 },
      })
      await store.fetchSavedSearches()
      expect(store.pageCount).toBe(2)
    })
  })
})
