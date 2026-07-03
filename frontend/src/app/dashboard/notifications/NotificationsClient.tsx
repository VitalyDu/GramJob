'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Bell } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'
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

type TabValue = 'all' | 'unread' | 'read'

const FILTER_TABS: { label: string; value: TabValue; isRead: boolean | undefined }[] = [
  { label: 'Все', value: 'all', isRead: undefined },
  { label: 'Непрочитанные', value: 'unread', isRead: false },
  { label: 'Прочитанные', value: 'read', isRead: true },
]

export const NotificationsClient = observer(function NotificationsClient() {
  const { notification: store } = useStores()
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const isReadFilter = FILTER_TABS.find((t) => t.value === activeTab)?.isRead

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

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Уведомления"
        actions={
          store.unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Прочитать все ({store.unreadCount})
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {FILTER_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {store.isLoading && <CardListSkeleton count={6} />}

            {store.error && !store.isLoading && (
              <ErrorState
                message={store.error}
                onRetry={() => void store.fetchNotifications(isReadFilter)}
              />
            )}

            {!store.isLoading && store.notifications.length === 0 && !store.error && (
              <EmptyState icon={Bell} title="Нет уведомлений" />
            )}

            <div className="space-y-2">
              {store.notifications.map((n) => (
                <div
                  key={n.documentId}
                  className={`relative rounded-xl border p-4 transition ${
                    n.isRead ? 'border-border bg-card' : 'border-border bg-accent/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl" aria-hidden>
                      {TYPE_ICONS[n.type] ?? '📢'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-card-foreground">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
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
                        className="shrink-0 text-xs font-medium text-primary hover:underline"
                      >
                        Прочитано
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <PaginationBar
              page={store.page}
              pageCount={store.pageCount}
              onPageChange={handlePageChange}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
})
