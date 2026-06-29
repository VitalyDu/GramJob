import { makeAutoObservable, runInAction } from 'mobx'
import type { Block, BlockCreateInput } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type BlockMeta = { total: number; page: number; pageSize: number; pageCount: number }

export class BlockStore {
  blocks: Block[] = []
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  alreadyBlocked = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchBlocks(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Block[]; meta: BlockMeta }>(
        `/blocks?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.blocks = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch blocks'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createBlock(input: BlockCreateInput): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.alreadyBlocked = false
    })
    try {
      await api.post<{ data: Block }>('/blocks', input)
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } } | null
        if (body?.error?.code === 'ALREADY_BLOCKED') {
          runInAction(() => {
            this.alreadyBlocked = true
          })
          return
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to block user'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async removeBlock(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/blocks/${id}`)
      runInAction(() => {
        this.blocks = this.blocks.filter((b) => b.documentId !== id)
        this.total = Math.max(0, this.total - 1)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to remove block'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearFlags(): void {
    this.alreadyBlocked = false
  }
}
