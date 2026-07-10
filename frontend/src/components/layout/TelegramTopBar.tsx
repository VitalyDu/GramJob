'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Globe, Heart, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { NotificationBadge } from '@/components/notification/NotificationBadge'
import { LanguageDrawer } from './LanguageDrawer'
import { UserMenuDrawer } from './UserMenuDrawer'

export const TelegramTopBar = observer(function TelegramTopBar() {
  const { auth } = useStores()
  const { t } = useTranslation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  return (
    <>
      <header className="w-full border-b bg-background">
        <div className="flex h-12 items-center justify-between px-3">
          <Link href="/" aria-label={t('nav.home')}>
            <Image
              src="/logo-horizontal.png"
              alt="GramJob"
              width={80}
              height={28}
              priority
              className="h-7 w-auto"
            />
          </Link>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setLangOpen(true)}
              aria-label={t('nav.languageSwitcher')}
            >
              <Globe className="h-4 w-4" />
            </Button>

            {auth.isAuthenticated && (
              <>
                <NotificationBadge />

                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <Link href="/dashboard/favorites" aria-label={t('nav.favorites')}>
                    <Heart className="h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <Link href="/dashboard/profile" aria-label={t('nav.settings')}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}

            {auth.isAuthenticated && auth.user ? (
              <button
                type="button"
                className="ml-0.5 rounded-full outline-none ring-ring focus-visible:ring-2"
                onClick={() => setUserMenuOpen(true)}
                aria-label={t('nav.userMenu')}
              >
                <UserAvatar user={auth.user} className="h-8 w-8" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {auth.isAuthenticated && auth.user && (
        <UserMenuDrawer open={userMenuOpen} onOpenChange={setUserMenuOpen} />
      )}
      <LanguageDrawer open={langOpen} onOpenChange={setLangOpen} />
    </>
  )
})
