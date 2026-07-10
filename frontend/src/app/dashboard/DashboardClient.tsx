'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Briefcase,
  Building2,
  FileText,
  Heart,
  ListChecks,
  MessageSquare,
  Plus,
  Shield,
  Star,
  User,
} from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'

export const DashboardClient = observer(function DashboardClient() {
  const router = useRouter()
  const { auth, notification } = useStores()
  const { t } = useTranslation()

  const SECTIONS = [
    {
      href: '/dashboard/vacancies',
      icon: Briefcase,
      label: t('dashboard.sections_list.vacancies.label'),
      desc: t('dashboard.sections_list.vacancies.desc'),
    },
    {
      href: '/dashboard/resumes',
      icon: FileText,
      label: t('dashboard.sections_list.resumes.label'),
      desc: t('dashboard.sections_list.resumes.desc'),
    },
    {
      href: '/dashboard/companies',
      icon: Building2,
      label: t('dashboard.sections_list.companies.label'),
      desc: t('dashboard.sections_list.companies.desc'),
    },
    {
      href: '/dashboard/applications',
      icon: MessageSquare,
      label: t('dashboard.sections_list.applications.label'),
      desc: t('dashboard.sections_list.applications.desc'),
    },
    {
      href: '/dashboard/publications',
      icon: ListChecks,
      label: t('dashboard.sections_list.publications.label'),
      desc: t('dashboard.sections_list.publications.desc'),
    },
    {
      href: '/dashboard/favorites',
      icon: Heart,
      label: t('dashboard.sections_list.favorites.label'),
      desc: t('dashboard.sections_list.favorites.desc'),
    },
    {
      href: '/dashboard/notifications',
      icon: Bell,
      label: t('dashboard.sections_list.notifications.label'),
      desc: t('dashboard.sections_list.notifications.desc'),
      badge: 'unread' as const,
    },
    {
      href: '/dashboard/blocks',
      icon: Shield,
      label: t('dashboard.sections_list.blocks.label'),
      desc: t('dashboard.sections_list.blocks.desc'),
    },
    {
      href: '/subscription',
      icon: Star,
      label: t('dashboard.sections_list.subscription.label'),
      desc: t('dashboard.sections_list.subscription.desc'),
    },
    {
      href: '/dashboard/profile',
      icon: User,
      label: t('dashboard.sections_list.profile.label'),
      desc: t('dashboard.sections_list.profile.desc'),
    },
  ]

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/login')
  }, [auth.isAuthenticated, router])

  useEffect(() => {
    if (auth.isAuthenticated) void notification.fetchUnreadCount()
  }, [auth.isAuthenticated, notification])

  if (!auth.isAuthenticated || !auth.user) return null

  const name = auth.user.firstName ?? auth.user.email

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('dashboard.greeting', { name })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.greetingDesc')}</p>
        </div>
        <Link href="/subscription" aria-label={t('dashboard.manageSubscription')}>
          <SubscriptionBadge plan={auth.user.subscriptionPlan} />
        </Link>
      </div>

      <section aria-label={t('dashboard.quickActions')} className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/vacancies/new">
            <Plus className="mr-1.5 h-4 w-4" />
            {t('dashboard.createVacancy')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/resumes/new">
            <Plus className="mr-1.5 h-4 w-4" />
            {t('dashboard.createResume')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/companies/new">
            <Plus className="mr-1.5 h-4 w-4" />
            {t('dashboard.addCompany')}
          </Link>
        </Button>
      </section>

      <section
        aria-label={t('dashboard.sections')}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {SECTIONS.map(({ href, icon: Icon, label, desc, ...rest }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold group-hover:text-primary">
                    {label}
                    {'badge' in rest && notification.unreadCount > 0 && (
                      <Badge className="h-5 min-w-5 justify-center px-1">
                        {notification.unreadCount}
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
})
