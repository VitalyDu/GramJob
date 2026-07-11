'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import {
  Archive,
  BarChart2,
  Briefcase,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Users,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { hapticNotify } from '@/lib/telegram'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { LimitBar } from '@/components/vacancy/LimitBar'
import { UpsellModal } from '@/components/vacancy/UpsellModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { EntityActionsDrawer } from '@/components/shared/EntityActionsDrawer'
import {
  canPublishVacancy,
  canBoostVacancy,
  canArchiveVacancy,
  canEditVacancy,
} from '@/lib/vacancy-utils'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'
import { PLAN_LIMITS } from './plan-limits'

export const MyVacanciesClient = observer(function MyVacanciesClient() {
  const { t } = useTranslation()
  const { vacancy: store, auth } = useStores()
  useRequireAuth()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeVacancy = activeId ? store.myVacancies.find((v) => v.documentId === activeId) : null

  useEffect(() => {
    void store.fetchMyVacancies()
  }, [store])

  const plan = auth.user?.subscriptionPlan ?? 'free'
  const limit = PLAN_LIMITS[plan] ?? 3
  const used = auth.user?.vacancyCredits !== undefined ? limit - auth.user.vacancyCredits : 0

  const handlePublish = async (id: string) => {
    await store.publishVacancy(id)
    if (!store.error && !store.limitReached) {
      hapticNotify('success')
      toast.success(t('moderation.toasts.vacancySubmitted'))
    }
  }

  const handleBoost = (id: string) => {
    void store.boostVacancy(id)
  }

  const handleArchive = (id: string) => {
    if (!window.confirm(t('dashboard.vacancies.confirmArchive'))) return
    void store.archiveVacancy(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyVacancies(page)
  }

  if (!auth.isAuthenticated) return null

  return (
    <div className="space-y-6">
      <UpsellModal isOpen={store.limitReached} onClose={() => store.clearLimitReached()} />

      <PageHeader
        title={t('dashboard.vacancies.title')}
        description={t('dashboard.sections_list.vacancies.desc')}
        actions={
          <Button
            asChild
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label={t('dashboard.vacancies.createNew')}
          >
            <Link href="/dashboard/vacancies/new">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <LimitBar used={used} limit={limit} />
        </CardContent>
      </Card>

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchMyVacancies()} />
      )}

      {!store.isLoading && store.myVacancies.length === 0 && !store.error && (
        <EmptyState
          icon={Briefcase}
          title={t('dashboard.vacancies.empty')}
          description={t('dashboard.vacancies.emptyDesc')}
          action={
            <Button asChild>
              <Link href="/dashboard/vacancies/new">{t('dashboard.vacancies.create')}</Link>
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {store.myVacancies.map((v) => (
          <div key={v.documentId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-card-foreground">{v.title}</p>
                  <VacancyStatusBadge status={v.moderationStatus} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{v.company?.name}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label={t('actions.openActions')}
                onClick={() => {
                  setActiveId(v.documentId)
                  setDrawerOpen(true)
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{t('dashboard.vacancies.views', { count: v.views ?? 0 })}</span>
              <span>
                {t('dashboard.vacancies.applications', { count: v.applicationsCount ?? 0 })}
              </span>
              {v.expiresAt && (
                <span>
                  {t('dashboard.vacancies.expires')}{' '}
                  {new Date(v.expiresAt).toLocaleDateString('ru', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
            {v.moderationStatus === 'rejected' && (
              <RejectionNotice
                {...(v.rejectionReason != null ? { reason: v.rejectionReason } : {})}
                {...(v.rejectionComment != null ? { comment: v.rejectionComment } : {})}
                editHref={`/dashboard/vacancies/${v.documentId}/edit`}
                onResubmit={() => void handlePublish(v.documentId)}
                resubmitDisabled={store.isLoading}
              />
            )}
          </div>
        ))}
      </div>

      {activeVacancy && (
        <EntityActionsDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={activeVacancy.title}
          statusBadge={<VacancyStatusBadge status={activeVacancy.moderationStatus} />}
          actions={[
            {
              id: 'view',
              icon: Eye,
              label: t('actions.view'),
              description: t('actions.viewDesc'),
              href: `/vacancies/${activeVacancy.documentId}`,
            },
            {
              id: 'analytics',
              icon: BarChart2,
              label: t('actions.analytics'),
              description: t('actions.analyticsDesc'),
              href: `/dashboard/vacancies/${activeVacancy.documentId}/analytics`,
            },
            {
              id: 'applications',
              icon: Users,
              label: t('actions.applications'),
              description: t('actions.applicationsDesc'),
              href: `/dashboard/vacancies/${activeVacancy.documentId}/applications`,
            },
            ...(canEditVacancy(activeVacancy.moderationStatus)
              ? [
                  {
                    id: 'edit',
                    icon: Pencil,
                    label: t('actions.edit'),
                    description: t('actions.editDesc'),
                    href: `/dashboard/vacancies/${activeVacancy.documentId}/edit`,
                  },
                ]
              : []),
            ...(canPublishVacancy(activeVacancy.moderationStatus)
              ? [
                  {
                    id: 'publish',
                    icon: Send,
                    label: t('actions.toModeration'),
                    description: t('actions.toModerationDesc'),
                    onClick: () => void handlePublish(activeVacancy.documentId),
                    disabled: store.isLoading,
                  },
                ]
              : []),
            ...(canBoostVacancy(activeVacancy.moderationStatus)
              ? [
                  {
                    id: 'boost',
                    icon: Zap,
                    label: t('actions.boost'),
                    description: t('actions.boostDesc'),
                    onClick: () => handleBoost(activeVacancy.documentId),
                    disabled: store.isLoading,
                  },
                ]
              : []),
            ...(canArchiveVacancy(activeVacancy.moderationStatus)
              ? [
                  {
                    id: 'archive',
                    icon: Archive,
                    label: t('actions.archive'),
                    description: t('actions.archiveDesc'),
                    onClick: () => handleArchive(activeVacancy.documentId),
                    variant: 'destructive' as const,
                    disabled: store.isLoading,
                  },
                ]
              : []),
          ]}
        />
      )}

      <PaginationBar
        page={store.page}
        pageCount={store.pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
