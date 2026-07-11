'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Heart, LayoutDashboard, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'
import { NotificationBadge } from '@/components/notification/NotificationBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { LanguageDrawer } from './LanguageDrawer'
import { UserMenuDrawer } from './UserMenuDrawer'

const iconBtnBase =
  'flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
const iconBtnInactive =
  'bg-background/75 text-foreground/70 hover:bg-background/95 hover:text-foreground'
const iconBtnActive = 'bg-primary/20 text-primary'

function IconButton({
  active,
  onClick,
  href,
  label,
  children,
}: {
  active?: boolean
  onClick?: () => void
  href?: string
  label: string
  children: React.ReactNode
}) {
  const cls = cn(iconBtnBase, active ? iconBtnActive : iconBtnInactive)

  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {children}
    </button>
  )
}

export const TelegramTopBar = observer(function TelegramTopBar() {
  const { auth } = useStores()
  const { t } = useTranslation()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const user = auth.user
  const isDark = resolvedTheme === 'dark'
  const isDashboard = pathname === '/dashboard'

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-50 w-full">
        <div className="flex h-12 items-center justify-between gap-2 px-3">
          {/* Left: avatar + name + plan */}
          {auth.isAuthenticated && user ? (
            <button
              type="button"
              aria-label={t('nav.userMenu')}
              onClick={() => setUserMenuOpen(true)}
              className="flex min-w-0 items-center gap-1.5 rounded-full bg-background/75 py-0.5 pl-0.5 pr-2.5 backdrop-blur-sm transition-colors hover:bg-background/95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserAvatar user={user} className="h-8 w-8 shrink-0" />
              <SubscriptionBadge plan={user.subscriptionPlan} />
            </button>
          ) : (
            <div />
          )}

          {/* Right: actions + dashboard */}
          <div className="flex shrink-0 items-center gap-1.5">
            <IconButton
              label={t('nav.themeSwitcher')}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconButton>

            <IconButton label={t('nav.languageSwitcher')} onClick={() => setLangOpen(true)}>
              <Globe className="h-4 w-4" />
            </IconButton>

            {auth.isAuthenticated && (
              <>
                <NotificationBadge
                  className={cn(
                    iconBtnBase,
                    pathname.startsWith('/dashboard/notifications')
                      ? iconBtnActive
                      : iconBtnInactive
                  )}
                />

                <IconButton
                  href="/dashboard/favorites"
                  label={t('nav.favorites')}
                  active={pathname.startsWith('/dashboard/favorites')}
                >
                  <Heart className="h-4 w-4" />
                </IconButton>
              </>
            )}

            <Link
              href="/dashboard"
              aria-label={t('nav.dashboard')}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium backdrop-blur-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isDashboard ? iconBtnActive : iconBtnInactive
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>{t('nav.dashboard')}</span>
            </Link>
          </div>
        </div>
      </header>

      {auth.isAuthenticated && (
        <UserMenuDrawer open={userMenuOpen} onOpenChange={setUserMenuOpen} />
      )}
      <LanguageDrawer open={langOpen} onOpenChange={setLangOpen} />
    </>
  )
})
