'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Globe, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
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

  const initial = auth.user.firstName?.charAt(0) ?? auth.user.email?.charAt(0) ?? '?'
  const displayName = auth.user.firstName + (auth.user.lastName ? ` ${auth.user.lastName}` : '')

  const close = () => onOpenChange(false)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom">
          <SheetHeader>
            <Link
              href="/dashboard/profile"
              onClick={close}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-accent"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {initial.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <span className="font-medium leading-none">{displayName}</span>
                <SubscriptionBadge plan={auth.user.subscriptionPlan} />
              </div>
            </Link>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4 pb-4">
            <Link
              href="/dashboard/notifications"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Bell className="h-4 w-4" />
              {t('nav.notifications')}
            </Link>
            <Link
              href="/subscription"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Star className="h-4 w-4" />
              {t('nav.subscription')}
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
        </SheetContent>
      </Sheet>
      <LanguageDrawer open={langOpen} onOpenChange={setLangOpen} />
    </>
  )
})
