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
} from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export const DashboardClient = observer(function DashboardClient() {
  const router = useRouter()
  const { auth } = useStores()
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
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

      <section aria-label={t('dashboard.sections')} className="grid grid-cols-1 gap-2">
        {SECTIONS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} className="group">
            <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold group-hover:text-primary">{label}</p>
                  <p className="truncate text-sm text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t('dashboard.quickActions')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4 pb-4">
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
        </SheetContent>
      </Sheet>
    </div>
  )
})
