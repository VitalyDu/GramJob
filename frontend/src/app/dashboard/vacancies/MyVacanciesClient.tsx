'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { LimitBar } from '@/components/vacancy/LimitBar'
import { UpsellModal } from '@/components/vacancy/UpsellModal'
import { Button } from '@/components/ui/button'
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
      toast.success('Вакансия отправлена на модерацию')
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои вакансии</h1>
        <Link
          href="/dashboard/vacancies/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Создать вакансию
        </Link>
      </div>

      <LimitBar used={used} limit={limit} />

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.myVacancies.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас пока нет вакансий.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.myVacancies.map((v) => (
          <div key={v.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-gray-900">{v.title}</p>
                  <VacancyStatusBadge status={v.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {v.company?.name} · {SENIORITY_LABELS[v.seniority]} ·{' '}
                  {WORK_FORMAT_LABELS[v.workFormat]}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {canEditVacancy(v.status) && (
                  <Link
                    href={`/dashboard/vacancies/${v.documentId}/edit`}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
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
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Аналитика
                </Link>
              </div>
            </div>

            <div className="mt-2 flex gap-4 text-xs text-gray-400">
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

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.page <= 1}
            onClick={() => handlePageChange(store.page - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.page} / {store.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.page >= store.pageCount}
            onClick={() => handlePageChange(store.page + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
