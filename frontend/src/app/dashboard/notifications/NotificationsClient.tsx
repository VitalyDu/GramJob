'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dateLocale } from '@/lib/date-utils'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import {
  NOTIFICATION_TYPE_ICONS,
  DEFAULT_NOTIFICATION_ICON,
  stripLeadingEmoji,
} from '@/lib/notification-utils'

type TabValue = 'all' | 'unread' | 'read'

export const NotificationsClient = observer(function NotificationsClient() {
  const { t, i18n } = useTranslation()
  const { notification: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const FILTER_TABS: { label: string; value: TabValue; isRead: boolean | undefined }[] = [
    { label: t('dashboard.notifications.tabs.all'), value: 'all', isRead: undefined },
    { label: t('dashboard.notifications.tabs.unread'), value: 'unread', isRead: false },
    { label: t('dashboard.notifications.tabs.read'), value: 'read', isRead: true },
  ]

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

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.notifications.title')}
        actions={
          store.unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              {t('dashboard.notifications.markAllRead', { count: store.unreadCount })}
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
              <EmptyState icon={Bell} title={t('dashboard.notifications.empty')} />
            )}

            <div className="space-y-2">
              {store.notifications.map((n) => {
                const Icon = NOTIFICATION_TYPE_ICONS[n.type] ?? DEFAULT_NOTIFICATION_ICON
                return (
                  <div
                    key={n.documentId}
                    className={`relative rounded-xl border p-4 transition ${
                      n.isRead ? 'border-border bg-card' : 'border-border bg-accent/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-card-foreground">{n.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {stripLeadingEmoji(n.body)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString(dateLocale(i18n.language), {
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
                          {t('dashboard.notifications.markRead')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
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
