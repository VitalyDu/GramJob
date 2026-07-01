import { makeAutoObservable, runInAction } from 'mobx'
import type { Notification } from '@/types/api'
import { api } from '@/services/api'

export class NotificationStore {
  notifications: Notification[] = []
  unreadCount = 0
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

  async fetchNotifications(isRead?: boolean, page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(this.pageSize),
      })
      if (isRead === true) params.set('isRead', 'true')
      if (isRead === false) params.set('isRead', 'false')

      const res = await api.get<{
        data: Notification[]
        meta: { total: number; page: number; pageSize: number; pageCount: number }
      }>(`/notifications?${params.toString()}`)

      runInAction(() => {
        this.notifications = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch notifications'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchUnreadCount(): Promise<void> {
    try {
      const res = await api.get<{
        data: Notification[]
        meta: { total: number; page: number; pageSize: number; pageCount: number }
      }>('/notifications?isRead=false&pageSize=1')
      runInAction(() => {
        this.unreadCount = res.meta.total
      })
    } catch {
      // badge failure is non-critical — silently ignore
    }
  }

  async markRead(documentId: string): Promise<void> {
    try {
      await api.patch<{ data: { documentId: string; isRead: boolean } }>(
        `/notifications/${documentId}/read`,
        {}
      )
      runInAction(() => {
        const n = this.notifications.find((x) => x.documentId === documentId)
        if (n && !n.isRead) {
          n.isRead = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to mark as read'
      })
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await api.post<{ ok: boolean }>('/notifications/read-all', {})
      runInAction(() => {
        this.notifications.forEach((n) => {
          n.isRead = true
        })
        this.unreadCount = 0
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to mark all as read'
      })
    }
  }
}
