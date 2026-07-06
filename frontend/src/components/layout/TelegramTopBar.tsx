'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LanguageDrawer } from './LanguageDrawer'
import { UserMenuDrawer } from './UserMenuDrawer'

export const TelegramTopBar = observer(function TelegramTopBar() {
  const { auth, notification } = useStores()
  const { t } = useTranslation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const initial = auth.user?.firstName?.charAt(0) ?? auth.user?.email?.charAt(0) ?? '?'

  return (
    <>
      <div className="fixed right-4 top-3 z-50 flex items-center gap-2">
        {auth.isAuthenticated && auth.user && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur"
            onClick={() => setUserMenuOpen(true)}
            aria-label={t('nav.userMenu')}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initial.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}

        {auth.isAuthenticated && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full bg-background/80 backdrop-blur"
          >
            <Link href="/dashboard/notifications" aria-label={t('notifications.ariaLabel')}>
              <Bell className="h-4 w-4" />
              {notification.unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
                </span>
              )}
            </Link>
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur"
          onClick={() => setLangOpen(true)}
          aria-label={t('nav.languageSwitcher')}
        >
          <Globe className="h-4 w-4" />
        </Button>
      </div>

      {auth.isAuthenticated && auth.user && (
        <UserMenuDrawer open={userMenuOpen} onOpenChange={setUserMenuOpen} />
      )}
      <LanguageDrawer open={langOpen} onOpenChange={setLangOpen} />
    </>
  )
})
