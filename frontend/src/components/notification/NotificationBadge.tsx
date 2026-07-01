'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'

export const NotificationBadge = observer(function NotificationBadge() {
  const { notification } = useStores()

  useEffect(() => {
    void notification.fetchUnreadCount()
  }, [notification])

  return (
    <Link
      href="/dashboard/notifications"
      className="relative flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Уведомления"
    >
      <span className="text-lg">🔔</span>
      {notification.unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
          {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
        </span>
      )}
    </Link>
  )
})
