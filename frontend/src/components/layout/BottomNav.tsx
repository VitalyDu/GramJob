'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { Briefcase, Heart, LayoutDashboard, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLink = {
  href: string
  icon: typeof Briefcase
  label: string
  isActive: (pathname: string) => boolean
}

export function BottomNav({ isMiniApp }: { isMiniApp: boolean }) {
  const { t } = useTranslation('common')
  const pathname = usePathname()

  const links: NavLink[] = [
    {
      href: '/vacancies',
      icon: Briefcase,
      label: t('nav.vacancies'),
      isActive: (p) => p.startsWith('/vacancies'),
    },
    {
      href: '/dashboard/applications',
      icon: MessageSquare,
      label: t('nav.applications'),
      isActive: (p) => p.startsWith('/dashboard/applications'),
    },
    {
      href: '/dashboard/favorites',
      icon: Heart,
      label: t('nav.favorites'),
      isActive: (p) => p.startsWith('/dashboard/favorites'),
    },
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      isActive: (p) =>
        p === '/dashboard' ||
        (p.startsWith('/dashboard') &&
          !p.startsWith('/dashboard/applications') &&
          !p.startsWith('/dashboard/favorites')),
    },
  ]

  return (
    <nav
      aria-label={t('nav.main')}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        !isMiniApp && 'md:hidden'
      )}
    >
      <div className="mx-auto flex max-w-6xl pb-[env(safe-area-inset-bottom)]">
        {links.map(({ href, icon: Icon, label, isActive }) => {
          const active = isActive(pathname)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
