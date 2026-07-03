'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
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
import {
  canPublishVacancy,
  canBoostVacancy,
  canArchiveVacancy,
  canEditVacancy,
  WORK_FORMAT_LABELS,
  SENIORITY_LABELS,
} from '@/lib/vacancy-utils'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'
import { PLAN_LIMITS } from './plan-limits'

export const MyVacanciesClient = observer(function MyVacanciesClient() {
  const { t } = useTranslation()
  const { vacancy: store, auth } = useStores()

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
    if (!window.confirm('Архивировать вакансию?')) return
    void store.archiveVacancy(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyVacancies(page)
  }

  return (
    <div className="space-y-6">
      <UpsellModal isOpen={store.limitReached} onClose={() => store.clearLimitReached()} />

      <PageHeader
        title="Мои вакансии"
        actions={
          <Button asChild>
            <Link href="/dashboard/vacancies/new">+ Создать вакансию</Link>
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
          title="Нет вакансий"
          description="Создайте первую вакансию, чтобы начать поиск кандидатов"
          action={
            <Button asChild>
              <Link href="/dashboard/vacancies/new">Создать вакансию</Link>
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {store.myVacancies.map((v) => (
          <div key={v.documentId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-card-foreground">{v.title}</p>
                  <VacancyStatusBadge status={v.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {v.company?.name} · {SENIORITY_LABELS[v.seniority]} ·{' '}
                  {WORK_FORMAT_LABELS[v.workFormat]}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {canEditVacancy(v.status) && (
                  <Link
                    href={`/dashboard/vacancies/${v.documentId}/edit`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    Редактировать
                  </Link>
                )}
                {canPublishVacancy(v.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handlePublish(v.documentId)}
                    disabled={store.isLoading}
                  >
                    На модерацию
                  </Button>
                )}
                {canBoostVacancy(v.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBoost(v.documentId)}
                    disabled={store.isLoading}
                  >
                    ↑ Поднять
                    {store.boostsRemaining !== null && (
                      <span className="ml-1 text-xs opacity-70">({store.boostsRemaining})</span>
                    )}
                  </Button>
                )}
                {canArchiveVacancy(v.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleArchive(v.documentId)}
                    disabled={store.isLoading}
                  >
                    В архив
                  </Button>
                )}
                <Link
                  href={`/dashboard/vacancies/${v.documentId}/analytics`}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Аналитика
                </Link>
              </div>
            </div>

            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{v.views ?? 0} просмотров</span>
              <span>{v.applicationsCount ?? 0} откликов</span>
              {v.expiresAt && (
                <span>
                  Истекает{' '}
                  {new Date(v.expiresAt).toLocaleDateString('ru', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
            {v.status === 'rejected' && (
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

      <PaginationBar
        page={store.page}
        pageCount={store.pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
