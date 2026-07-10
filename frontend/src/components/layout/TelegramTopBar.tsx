'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Heart, Settings, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'
import { NotificationBadge } from '@/components/notification/NotificationBadge'
import { LanguageDrawer } from './LanguageDrawer'
import { UserMenuDrawer } from './UserMenuDrawer'

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
  const cls = cn(
    'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
    active
      ? 'bg-primary/15 text-primary'
      : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
  )

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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const headerCls = 'absolute top-0 left-0 right-0 z-50 w-full'

  return (
    <>
      <header className={headerCls}>
        <div className="flex h-12 items-center justify-end px-3">
          <div className="flex items-center gap-1.5">
            <IconButton label={t('nav.languageSwitcher')} onClick={() => setLangOpen(true)}>
              <Globe className="h-4 w-4" />
            </IconButton>

            {auth.isAuthenticated && (
              <>
                <NotificationBadge
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                    pathname.startsWith('/dashboard/notifications')
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                />

                <IconButton
                  href="/dashboard/favorites"
                  label={t('nav.favorites')}
                  active={pathname.startsWith('/dashboard/favorites')}
                >
                  <Heart className="h-4 w-4" />
                </IconButton>

                <IconButton
                  href="/dashboard/profile"
                  label={t('nav.settings')}
                  active={pathname.startsWith('/dashboard/profile')}
                >
                  <Settings className="h-4 w-4" />
                </IconButton>
              </>
            )}

            {auth.isAuthenticated ? (
              <IconButton label={t('nav.userMenu')} onClick={() => setUserMenuOpen(true)}>
                <User className="h-4 w-4" />
              </IconButton>
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
