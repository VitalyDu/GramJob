'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Globe, Heart, Settings, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { Drawer, DrawerContent, DrawerHeader } from '@/components/ui/drawer'
import { LanguageDrawer } from './LanguageDrawer'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UserMenuDrawer = observer(function UserMenuDrawer({ open, onOpenChange }: Props) {
  const { auth } = useStores()
  const { t } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)

  if (!auth.isAuthenticated || !auth.user) return null

  const displayName =
    (auth.user.firstName || auth.user.email) + (auth.user.lastName ? ` ${auth.user.lastName}` : '')

  const close = () => onOpenChange(false)

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <Link href="/dashboard/profile" onClick={close} className="flex items-center gap-3 p-1">
              <UserAvatar user={auth.user} className="h-10 w-10" />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate font-medium leading-none">{displayName}</span>
                <SubscriptionBadge plan={auth.user.subscriptionPlan} />
              </div>
            </Link>
          </DrawerHeader>
          <div className="flex flex-col gap-0.5 px-4 pb-6 pt-1">
            <Link
              href="/dashboard/notifications"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Bell className="h-4 w-4" />
              {t('nav.notifications')}
            </Link>
            <Link
              href="/dashboard/favorites"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Heart className="h-4 w-4" />
              {t('nav.favorites')}
            </Link>
            <Link
              href="/subscription"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Star className="h-4 w-4" />
              {t('nav.subscription')}
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              {t('nav.settings')}
            </Link>
            <button
              type="button"
              onClick={() => {
                close()
                setLangOpen(true)
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent"
            >
              <Globe className="h-4 w-4" />
              {t('nav.languageSwitcher')}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
      <LanguageDrawer open={langOpen} onOpenChange={setLangOpen} />
    </>
  )
})
