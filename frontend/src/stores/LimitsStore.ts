import { makeAutoObservable, runInAction } from 'mobx'
import type { UserLimits } from '@/types/api'
import { api } from '@/services/api'

export class LimitsStore {
  data: UserLimits | null = null
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchLimits(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const data = await api.get<UserLimits>('/users/me/limits')
      runInAction(() => {
        this.data = data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch limits'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}
