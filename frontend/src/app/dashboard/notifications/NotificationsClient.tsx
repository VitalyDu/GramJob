'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import type { NotificationType } from '@/types/api'

const TYPE_ICONS: Partial<Record<NotificationType, string>> = {
  new_application: '📩',
  application_approved: '✅',
  application_rejected: '❌',
  interview_invitation: '📅',
  test_task: '📝',
  offer_received: '🎉',
  resume_viewed: '👁',
  vacancy_viewed: '👁',
  vacancy_expiring_soon: '⏰',
  vacancy_expired: '🔴',
  subscription_expiring: '⚠️',
  subscription_expired: '🔴',
  limits_reached: '🚫',
  saved_search_match: '🔔',
  moderation_approved: '✅',
  moderation_rejected: '❌',
}

const FILTER_TABS = [
  { label: 'Все', value: undefined },
  { label: 'Непрочитанные', value: false },
  { label: 'Прочитанные', value: true },
] as const

export const NotificationsClient = observer(function NotificationsClient() {
  const { notification: store } = useStores()
  const [isReadFilter, setIsReadFilter] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    void store.fetchNotifications(isReadFilter)
    // WebHeader badge is absent in the Mini App, so load the unread count here too
    void store.fetchUnreadCount()
  }, [store, isReadFilter])

  const handleMarkRead = (documentId: string) => {
    void store.markRead(documentId)
  }

  const handleMarkAllRead = () => {
    void store.markAllRead()
  }

  const handlePageChange = (page: number) => {
    void store.fetchNotifications(isReadFilter, page)
  }

  const handleFilterChange = (value: boolean | undefined) => {
    setIsReadFilter(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Уведомления</h1>
        {store.unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Прочитать все ({store.unreadCount})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleFilterChange(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              isReadFilter === tab.value
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.notifications.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Нет уведомлений.</p>
        </div>
      )}

      <div className="space-y-2">
        {store.notifications.map((n) => (
          <div
            key={n.documentId}
            className={`relative rounded-xl border p-4 transition ${
              n.isRead ? 'border-gray-200 bg-white' : 'border-indigo-200 bg-indigo-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl" aria-hidden>
                {TYPE_ICONS[n.type] ?? '📢'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => handleMarkRead(n.documentId)}
                  className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Прочитано
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.page <= 1}
            onClick={() => handlePageChange(store.page - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.page} / {store.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.page >= store.pageCount}
            onClick={() => handlePageChange(store.page + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
