'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'

interface Props {
  /** Override classes for the icon button container */
  className?: string
}

export const NotificationBadge = observer(function NotificationBadge({ className }: Props) {
  const { notification } = useStores()
  const { t } = useTranslation()

  useEffect(() => {
    void notification.fetchUnreadCount()
  }, [notification])

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={t('notifications.ariaLabel')}
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-full transition-colors',
        'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      <Bell className="h-4 w-4" />
      {notification.unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
        </span>
      )}
    </Link>
  )
})
