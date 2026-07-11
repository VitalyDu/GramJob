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
import { LanguageDrawer } from './LanguageDrawer'
import { UserMenuDrawer } from './UserMenuDrawer'

const iconBtnBase =
  'flex h-8 w-8 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
const iconBtnInactive = 'text-muted-foreground hover:bg-muted hover:text-foreground'
const iconBtnActive = 'bg-primary/10 text-primary'

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

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-50 w-full">
        <div className="flex h-12 items-center justify-between px-3">
          {/* Left */}
          <IconButton
            href="/dashboard"
            label={t('nav.dashboard')}
            active={pathname === '/dashboard'}
          >
            <LayoutDashboard className="h-4 w-4" />
          </IconButton>

          {/* Right */}
          <div className="flex items-center gap-1.5">
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

            {auth.isAuthenticated && user ? (
              <button
                type="button"
                aria-label={t('nav.userMenu')}
                onClick={() => setUserMenuOpen(true)}
                className={cn(iconBtnBase, iconBtnInactive, 'overflow-hidden')}
              >
                <UserAvatar user={user} className="h-8 w-8" />
              </button>
            ) : null}
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
