'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { Briefcase, Heart, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLink = {
  href: string
  icon: typeof Briefcase
  label: string
}

export function MiniAppBottomNav() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const links: NavLink[] = [
    { href: '/vacancies', icon: Briefcase, label: t('nav.vacancies') },
    { href: '/dashboard/favorites', icon: Heart, label: t('nav.favorites') },
    { href: '/dashboard/applications', icon: MessageSquare, label: t('nav.applications') },
    { href: '/dashboard/profile', icon: User, label: t('nav.profile') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors',
              pathname.startsWith(href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
