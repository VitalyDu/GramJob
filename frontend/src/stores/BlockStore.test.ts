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
import { BlockStore } from './BlockStore'

const mockBlock = {
  documentId: 'blk123',
  targetType: 'employer' as const,
  targetId: 42,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockBlock],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('BlockStore', () => {
  let store: BlockStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new BlockStore()
  })

  describe('fetchBlocks', () => {
    it('fetches blocks and updates state', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchBlocks()
      expect(store.blocks).toHaveLength(1)
      expect(store.blocks[0]?.documentId).toBe('blk123')
      expect(store.total).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('passes page param to API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchBlocks(3)
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('page=3')
    })

    it('sets error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchBlocks()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createBlock', () => {
    it('calls POST /blocks successfully', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockBlock })
      await store.createBlock({ targetType: 'employer', targetId: 42 })
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/blocks', {
        targetType: 'employer',
        targetId: 42,
      })
      expect(store.alreadyBlocked).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('sets alreadyBlocked on ALREADY_BLOCKED code', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(409, { error: { code: 'ALREADY_BLOCKED' } }, 'Already blocked')
      )
      await store.createBlock({ targetType: 'employer', targetId: 42 })
      expect(store.alreadyBlocked).toBe(true)
      expect(store.error).toBeNull()
    })

    it('sets error and rethrows on other failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'))
      await expect(store.createBlock({ targetType: 'employer', targetId: 42 })).rejects.toThrow(
        'Server error'
      )
      expect(store.error).toBe('Server error')
    })
  })

  describe('removeBlock', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchBlocks()
    })

    it('removes block from list and decrements total', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined)
      await store.removeBlock('blk123')
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/blocks/blk123')
      expect(store.blocks).toHaveLength(0)
      expect(store.total).toBe(0)
    })

    it('sets error and rethrows on failure', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Not found'))
      await expect(store.removeBlock('blk123')).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
      expect(store.blocks).toHaveLength(1)
    })
  })

  describe('clearFlags', () => {
    it('resets alreadyBlocked to false', () => {
      store.alreadyBlocked = true
      store.clearFlags()
      expect(store.alreadyBlocked).toBe(false)
    })
  })

  describe('pageCount', () => {
    it('computes pageCount from total and pageSize', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 60, page: 1, pageSize: 20, pageCount: 3 },
      })
      await store.fetchBlocks()
      expect(store.pageCount).toBe(3)
    })
  })
})
