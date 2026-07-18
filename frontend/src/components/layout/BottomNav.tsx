'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { Briefcase, Building2, FileText, Home, LayoutDashboard, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLink = {
  href: string
  label: string
  icon: typeof Briefcase
  isActive: (pathname: string) => boolean
}

export function BottomNav({
  isMiniApp,
  isKeyboardOpen,
  isMainButtonVisible,
}: {
  isMiniApp: boolean
  isKeyboardOpen?: boolean
  isMainButtonVisible?: boolean
}) {
  const { t } = useTranslation('common')
  const pathname = usePathname()

  const baseLinks: NavLink[] = [
    {
      href: '/companies',
      icon: Building2,
      label: t('nav.companies'),
      isActive: (p) => p.startsWith('/companies'),
    },
    {
      href: '/vacancies',
      icon: Briefcase,
      label: t('nav.vacancies'),
      isActive: (p) => p.startsWith('/vacancies'),
    },
    {
      href: '/dashboard/resumes',
      icon: FileText,
      label: t('nav.myResumes'),
      isActive: (p) => p.startsWith('/dashboard/resumes'),
    },
    {
      href: '/dashboard/applications',
      icon: MessageSquare,
      label: t('nav.applications'),
      isActive: (p) => p.startsWith('/dashboard/applications'),
    },
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      isActive: (p) =>
        p === '/dashboard' ||
        (p.startsWith('/dashboard') &&
          !p.startsWith('/dashboard/resumes') &&
          !p.startsWith('/dashboard/applications')),
    },
  ]

  const gramJobLink: NavLink = {
    href: '/',
    icon: Home,
    label: 'GramJob',
    isActive: (p) => p === '/',
  }

  const miniAppLinks: NavLink[] = [
    gramJobLink,
    {
      href: '/companies',
      icon: Building2,
      label: t('nav.companies'),
      isActive: (p) => p.startsWith('/companies'),
    },
    {
      href: '/vacancies',
      icon: Briefcase,
      label: t('nav.vacancies'),
      isActive: (p) => p.startsWith('/vacancies'),
    },
    {
      href: '/dashboard/resumes',
      icon: FileText,
      label: t('nav.myResumes'),
      isActive: (p) => p.startsWith('/dashboard/resumes'),
    },
    {
      href: '/dashboard/applications',
      icon: MessageSquare,
      label: t('nav.applications'),
      isActive: (p) => p.startsWith('/dashboard/applications'),
    },
  ]

  const links = isMiniApp ? miniAppLinks : baseLinks

  return (
    <nav
      aria-label={t('nav.main')}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'transition-transform duration-200',
        (isKeyboardOpen || isMainButtonVisible) && 'translate-y-full',
        !isMiniApp && 'md:hidden'
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-6xl',
          isMiniApp
            ? 'pb-[max(env(safe-area-inset-bottom),16px)]'
            : 'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        {links.map((link) => {
          const active = link.isActive(pathname)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
