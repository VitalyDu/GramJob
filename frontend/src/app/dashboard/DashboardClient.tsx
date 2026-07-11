'use client'

import { useEffect, useState } from 'react'
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
  Users,
} from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner'
import { PlanLimitsCard } from '@/components/subscription/PlanLimitsCard'

export const DashboardClient = observer(function DashboardClient() {
  const router = useRouter()
  const { auth } = useStores()
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const isDesktop = useIsDesktop()

  const GROUPS = [
    {
      label: t('dashboard.groups.jobSeekers'),
      items: [
        {
          href: '/dashboard/resumes',
          icon: FileText,
          label: t('dashboard.sections_list.resumes.label'),
          desc: t('dashboard.sections_list.resumes.desc'),
        },
        {
          href: '/dashboard/applications',
          icon: MessageSquare,
          label: t('dashboard.sections_list.applications.label'),
          desc: t('dashboard.sections_list.applications.desc'),
        },
      ],
    },
    {
      label: t('dashboard.groups.employers'),
      items: [
        {
          href: '/dashboard/companies',
          icon: Building2,
          label: t('dashboard.sections_list.companies.label'),
          desc: t('dashboard.sections_list.companies.desc'),
        },
        {
          href: '/dashboard/vacancies',
          icon: Briefcase,
          label: t('dashboard.sections_list.vacancies.label'),
          desc: t('dashboard.sections_list.vacancies.desc'),
        },
        {
          href: '/resumes',
          icon: Users,
          label: t('dashboard.sections_list.resumes_db.label'),
          desc: t('dashboard.sections_list.resumes_db.desc'),
        },
      ],
    },
    {
      label: t('dashboard.groups.general'),
      items: [
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
      ],
    },
  ]

  const CREATE_ACTIONS = [
    {
      href: '/dashboard/resumes/new',
      icon: FileText,
      label: t('dashboard.createResume'),
    },
    {
      href: '/dashboard/vacancies/new',
      icon: Briefcase,
      label: t('dashboard.createVacancy'),
    },
    {
      href: '/dashboard/companies/new',
      icon: Building2,
      label: t('dashboard.addCompany'),
    },
  ]

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/login')
  }, [auth.isAuthenticated, router])

  if (!auth.isAuthenticated || !auth.user) return null

  const user = auth.user

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.greetingDesc')}</p>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={() => setCreateOpen(true)}
          aria-label={t('dashboard.quickActions')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <SubscriptionBanner />

      <PlanLimitsCard />

      <section aria-label={t('dashboard.sections')} className="space-y-4">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-2">
            <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map(({ href, icon: Icon, label, desc }, idx) => (
                <Link
                  key={href}
                  href={href}
                  className={
                    group.items.length % 2 !== 0 && idx === group.items.length - 1
                      ? 'group col-span-2'
                      : 'group'
                  }
                >
                  <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight group-hover:text-primary">
                          {label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <Drawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        direction={isDesktop ? 'right' : 'bottom'}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('dashboard.quickActions')}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-0.5 px-4 pb-6 pt-1">
            {CREATE_ACTIONS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setCreateOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
})
