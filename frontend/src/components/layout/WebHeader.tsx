'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { Check, FileText, Globe, Heart, LayoutDashboard, LogOut, Star } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { NotificationBadge } from '@/components/notification/NotificationBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import i18next from '@/lib/i18n'
import { LanguageDrawer } from './LanguageDrawer'

const STATIC_NAV_LINKS = [
  { href: '/vacancies', key: 'nav.vacancies' },
  { href: '/companies', key: 'nav.companies' },
] as const

function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language

  const setLang = (lang: string) => {
    void i18next.changeLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gramjob_lang', lang)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nav.languageSwitcher')}
          className="h-8 w-8"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setLang('ru')}
          className="flex items-center justify-between"
        >
          Русский
          {currentLang === 'ru' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang('en')}
          className="flex items-center justify-between"
        >
          English
          {currentLang === 'en' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const WebHeader = observer(function WebHeader() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { auth } = useStores()

  const [langDrawerOpen, setLangDrawerOpen] = useState(false)

  const mobileGlobeButton = (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('nav.languageSwitcher')}
        className="h-8 w-8"
        onClick={() => setLangDrawerOpen(true)}
      >
        <Globe className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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

        {auth.isAuthenticated && auth.user ? (
          <div className="flex items-center gap-2">
            {/* мобиль: Globe открывает Drawer */}
            {mobileGlobeButton}
            {/* десктоп: Globe открывает DropdownMenu */}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <NotificationBadge />
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/dashboard/favorites" aria-label={t('nav.favorites')}>
                <Heart className="h-4 w-4" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('nav.userMenu')}
                  className="flex items-center gap-2 rounded-full outline-none ring-ring focus-visible:ring-2"
                >
                  <UserAvatar user={auth.user} />
                  <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
                    {auth.user.firstName ?? auth.user.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-between gap-1">
                  <DropdownMenuItem asChild className="min-w-0 flex-1">
                    <Link href="/dashboard/profile">
                      <UserAvatar user={auth.user} className="mr-2 h-5 w-5" />
                      <span className="min-w-0 truncate">
                        {auth.user.firstName ?? auth.user.email}
                        {auth.user.lastName ? ` ${auth.user.lastName}` : ''}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/subscription">
                      <SubscriptionBadge plan={auth.user.subscriptionPlan} />
                    </Link>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('nav.dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/publications">
                    <FileText className="mr-2 h-4 w-4" />
                    {t('nav.publications')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscription">
                    <Star className="mr-2 h-4 w-4" />
                    {t('nav.subscription')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    auth.logout()
                    router.push('/')
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* мобиль: Globe открывает Drawer */}
            {mobileGlobeButton}
            {/* десктоп: Globe открывает DropdownMenu */}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <Button asChild size="sm">
              <Link href="/login">{t('nav.login')}</Link>
            </Button>
          </div>
        )}
      </nav>
      <LanguageDrawer open={langDrawerOpen} onOpenChange={setLangDrawerOpen} />
    </header>
  )
})
