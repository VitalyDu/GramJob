'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'
import { NotificationBadge } from '@/components/notification/NotificationBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { ModeToggle } from './ModeToggle'
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

  const user = auth.user

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-50 w-full">
        <div className="flex h-12 items-center justify-end px-3">
          <div className="flex items-center gap-1.5">
            <ModeToggle />

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
              </>
            )}

            {auth.isAuthenticated && user ? (
              <button
                type="button"
                aria-label={t('nav.userMenu')}
                onClick={() => setUserMenuOpen(true)}
                className="flex items-center rounded-full outline-none ring-ring focus-visible:ring-2"
              >
                <UserAvatar user={user} />
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
