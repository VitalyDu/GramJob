'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { observer } from 'mobx-react-lite'
import {
  Bell,
  Check,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Star,
  Sun,
} from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { isTelegramMiniApp } from '@/lib/telegram'
import { Drawer, DrawerContent, DrawerHeader } from '@/components/ui/drawer'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import i18next from '@/lib/i18n'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UserMenuDrawer = observer(function UserMenuDrawer({ open, onOpenChange }: Props) {
  const { auth } = useStores()
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const isDesktop = useIsDesktop()

  const user = auth.user
  if (!user) return null

  const close = () => onOpenChange(false)
  const isDark = resolvedTheme === 'dark'
  const isMiniApp = isTelegramMiniApp()

  const setLang = (lang: string) => {
    void i18next.changeLanguage(lang)
    if (typeof window !== 'undefined') localStorage.setItem('gramjob_lang', lang)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isDesktop ? 'right' : 'bottom'}>
      <DrawerContent>
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate font-semibold leading-tight">
                {user.firstName ?? user.email}
                {user.lastName ? ` ${user.lastName}` : ''}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <SubscriptionBadge plan={user.subscriptionPlan} />
          </div>
        </DrawerHeader>

        <div className="flex flex-col gap-0.5 overflow-y-auto px-4 pb-8 pt-3">
          <NavItem
            icon={<LayoutDashboard className="h-4 w-4" />}
            href="/dashboard"
            label={t('nav.dashboard')}
            onClick={close}
          />
          <NavItem
            icon={<Heart className="h-4 w-4" />}
            href="/dashboard/favorites"
            label={t('nav.favorites')}
            onClick={close}
          />
          <NavItem
            icon={<Bell className="h-4 w-4" />}
            href="/dashboard/notifications"
            label={t('nav.notifications')}
            onClick={close}
          />
          <NavItem
            icon={<FileText className="h-4 w-4" />}
            href="/dashboard/publications"
            label={t('nav.publications')}
            onClick={close}
          />
          <NavItem
            icon={<Star className="h-4 w-4" />}
            href="/subscription"
            label={t('nav.subscription')}
            onClick={close}
          />

          <Divider />

          <NavItem
            icon={<Settings className="h-4 w-4" />}
            href="/dashboard/profile"
            label={t('nav.settings')}
            onClick={close}
          />

          <Divider />

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? t('nav.themeLight') : t('nav.themeDark')}
          </button>

          <Divider />

          <p className="px-3 pb-0.5 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('nav.languageSwitcher')}
          </p>
          <button
            type="button"
            onClick={() => setLang('ru')}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            Русский
            {i18n.language === 'ru' && <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            English
            {i18n.language === 'en' && <Check className="h-4 w-4" />}
          </button>

          {!isMiniApp && (
            <>
              <Divider />

              <button
                type="button"
                onClick={() => {
                  auth.logout()
                  router.push('/')
                  close()
                }}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {t('auth.logout')}
              </button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
})

function NavItem({
  icon,
  href,
  label,
  onClick,
}: {
  icon: ReactNode
  href: string
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
    >
      {icon}
      {label}
    </Link>
  )
}

function Divider() {
  return <div className="my-1.5 border-t border-border" />
}
