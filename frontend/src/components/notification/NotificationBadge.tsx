'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'

export const NotificationBadge = observer(function NotificationBadge() {
  const { notification } = useStores()
  const { t } = useTranslation()

  useEffect(() => {
    void notification.fetchUnreadCount()
  }, [notification])

  return (
    <Button asChild variant="ghost" size="icon" className="relative h-8 w-8">
      <Link href="/dashboard/notifications" aria-label={t('notifications.ariaLabel')}>
        <Bell className="h-4 w-4" />
        {notification.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
          </span>
        )}
      </Link>
    </Button>
  )
})
