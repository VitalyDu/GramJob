'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import {
  Briefcase,
  Building2,
  FileText,
  ListChecks,
  MessageSquare,
  Plus,
  Shield,
} from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner'

export const DashboardClient = observer(function DashboardClient() {
  const router = useRouter()
  const { auth } = useStores()
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
      href: '/dashboard/blocks',
      icon: Shield,
      label: t('dashboard.sections_list.blocks.label'),
      desc: t('dashboard.sections_list.blocks.desc'),
    },
  ]

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/login')
  }, [auth.isAuthenticated, router])

  if (!auth.isAuthenticated || !auth.user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.title')}</h1>
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

      <SubscriptionBanner />

      <section
        aria-label={t('dashboard.sections')}
        className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3"
      >
        {SECTIONS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold group-hover:text-primary sm:text-base">
                    {label}
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
