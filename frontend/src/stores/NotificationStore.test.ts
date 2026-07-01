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
      patch: vi.fn(),
      post: vi.fn(),
    },
    ApiClientError,
  }
})

import { api } from '@/services/api'
import { NotificationStore } from './NotificationStore'

const mockNotification = {
  documentId: 'notif123',
  type: 'new_application' as const,
  title: 'Новый отклик',
  body: 'Новый отклик на Backend Dev от Иван Иванов',
  isRead: false,
  data: { entityType: 'vacancy', entityId: 'vac456' },
  createdAt: '2026-07-01T10:00:00Z',
}

const mockReadNotification = { ...mockNotification, documentId: 'notif789', isRead: true }

const mockListResponse = {
  data: [mockNotification],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('NotificationStore', () => {
  let store: NotificationStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new NotificationStore()
  })

  it('начальное состояние', () => {
    expect(store.notifications).toEqual([])
    expect(store.unreadCount).toBe(0)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.page).toBe(1)
  })

  it('pageCount вычисляется из total и pageSize', () => {
    store['total'] = 45
    store['pageSize'] = 20
    expect(store.pageCount).toBe(3)
  })

  it('fetchNotifications — успех, заполняет список', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockListResponse)
    await store.fetchNotifications()
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]?.documentId).toBe('notif123')
    expect(store.total).toBe(1)
    expect(store.isLoading).toBe(false)
  })

  it('fetchNotifications — с фильтром isRead=false', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockListResponse)
    await store.fetchNotifications(false, 1)
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('isRead=false')
  })

  it('fetchNotifications — с фильтром isRead=true', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ ...mockListResponse, data: [mockReadNotification] })
    await store.fetchNotifications(true)
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('isRead=true')
  })

  it('fetchNotifications — ошибка, устанавливает error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))
    await store.fetchNotifications()
    expect(store.error).toBe('Network error')
    expect(store.notifications).toHaveLength(0)
  })

  it('fetchUnreadCount — устанавливает unreadCount', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [],
      meta: { total: 7, page: 1, pageSize: 1, pageCount: 7 },
    })
    await store.fetchUnreadCount()
    expect(store.unreadCount).toBe(7)
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('isRead=false')
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('pageSize=1')
  })

  it('fetchUnreadCount — 0 если нет непрочитанных', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, pageSize: 1, pageCount: 0 },
    })
    await store.fetchUnreadCount()
    expect(store.unreadCount).toBe(0)
  })

  it('markRead — отправляет PATCH и обновляет isRead локально', async () => {
    store['notifications'] = [{ ...mockNotification }]
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { documentId: 'notif123', isRead: true } })
    await store.markRead('notif123')
    expect(vi.mocked(api.patch).mock.calls[0]?.[0]).toContain('notif123/read')
    expect(store.notifications[0]?.isRead).toBe(true)
  })

  it('markRead — уменьшает unreadCount', async () => {
    store['notifications'] = [{ ...mockNotification }]
    store['unreadCount'] = 3
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { documentId: 'notif123', isRead: true } })
    await store.markRead('notif123')
    expect(store.unreadCount).toBe(2)
  })

  it('markAllRead — отправляет POST и обновляет все локально', async () => {
    store['notifications'] = [
      { ...mockNotification },
      { ...mockNotification, documentId: 'notif2' },
    ]
    store['unreadCount'] = 2
    vi.mocked(api.post).mockResolvedValueOnce({ ok: true })
    await store.markAllRead()
    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toContain('read-all')
    expect(store.notifications.every((n) => n.isRead)).toBe(true)
    expect(store.unreadCount).toBe(0)
  })
})
