'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { Globe, Heart } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NotificationBadge } from '@/components/notification/NotificationBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { ModeToggle } from './ModeToggle'
import { LanguageDrawer } from './LanguageDrawer'
import { UserMenuDrawer } from './UserMenuDrawer'

const STATIC_NAV_LINKS = [
  { href: '/vacancies', key: 'nav.vacancies' },
  { href: '/companies', key: 'nav.companies' },
] as const

export const WebHeader = observer(function WebHeader() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { auth } = useStores()

  const [langDrawerOpen, setLangDrawerOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-6">
          <Link href="/" aria-label={t('nav.home')} className="flex items-center">
            <Image
              src="/logo-horizontal.png"
              alt="GramJob"
              width={80}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {STATIC_NAV_LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {t(key)}
              </Link>
            ))}
            {auth.isAuthenticated && (
              <Link
                href="/dashboard/resumes"
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname.startsWith('/dashboard/resumes')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {t('nav.myResumes')}
              </Link>
            )}
            {auth.isAuthenticated &&
              (auth.user?.subscriptionPlan === 'max' || auth.user?.subscriptionPlan === 'vip') && (
                <Link
                  href="/resumes"
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    pathname.startsWith('/resumes')
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {t('nav.resumeDatabase')}
                </Link>
              )}
            {auth.isAuthenticated && (
              <Link
                href="/subscription"
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname.startsWith('/subscription')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {t('nav.subscription')}
              </Link>
            )}
          </div>
        </div>

        {/* Right: actions */}
        {auth.isAuthenticated && auth.user ? (
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t('nav.languageSwitcher')}
              onClick={() => setLangDrawerOpen(true)}
            >
              <Globe className="h-4 w-4" />
            </Button>
            <NotificationBadge />
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/dashboard/favorites" aria-label={t('nav.favorites')}>
                <Heart className="h-4 w-4" />
              </Link>
            </Button>
            <button
              type="button"
              aria-label={t('nav.userMenu')}
              onClick={() => setUserMenuOpen(true)}
              className="flex items-center gap-2 rounded-full outline-none ring-ring focus-visible:ring-2"
            >
              <UserAvatar user={auth.user} />
              <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
                {auth.user.firstName ?? auth.user.email}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t('nav.languageSwitcher')}
              onClick={() => setLangDrawerOpen(true)}
            >
              <Globe className="h-4 w-4" />
            </Button>
            <Button asChild size="sm">
              <Link href="/login">{t('nav.login')}</Link>
            </Button>
          </div>
        )}
      </nav>

      <LanguageDrawer open={langDrawerOpen} onOpenChange={setLangDrawerOpen} />
      {auth.isAuthenticated && auth.user && (
        <UserMenuDrawer open={userMenuOpen} onOpenChange={setUserMenuOpen} />
      )}
    </header>
  )
})
