'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { Ban, Bell, LogOut, Monitor, Shield, Star, User } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { useTelegramInit } from '@/hooks/useTelegramInit'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { key: 'profile', href: '/dashboard/profile', icon: User, exact: true },
  { key: 'security', href: '/dashboard/profile/security', icon: Shield, requiresEmail: true },
  { key: 'interface', href: '/dashboard/profile/interface', icon: Monitor },
  { key: 'subscription', href: '/subscription', icon: Star },
  { key: 'blocks', href: '/dashboard/blocks', icon: Ban },
  { key: 'notifications', href: '/dashboard/profile/notifications', icon: Bell, onlyMiniApp: true },
] as const

export const SettingsNav = observer(function SettingsNav() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { auth } = useStores()
  const { isMiniApp } = useTelegramInit()

  const items = NAV_ITEMS.filter((item) => {
    if ('requiresEmail' in item && item.requiresEmail && !auth.user?.email) return false
    if ('onlyMiniApp' in item && item.onlyMiniApp && !isMiniApp) return false
    return true
  })

  const itemClasses = (active: boolean) =>
    cn(
      'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
    )

  return (
    <nav className="flex gap-1 overflow-x-auto md:w-56 md:shrink-0 md:flex-col md:overflow-visible">
      {items.map(({ key, href, icon: Icon, ...rest }) => {
        const active = 'exact' in rest && rest.exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={key} href={href} className={itemClasses(active)}>
            <Icon className="h-4 w-4 shrink-0" />
            {t(`settings.nav.${key}`)}
          </Link>
        )
      })}
      {!isMiniApp && (
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          onClick={() => {
            auth.logout()
            router.push('/')
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('settings.nav.logout')}
        </button>
      )}
    </nav>
  )
})
