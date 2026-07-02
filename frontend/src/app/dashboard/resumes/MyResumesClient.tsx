'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { Button } from '@/components/ui/button'
import {
  canPublishResume,
  canEditResume,
  canArchiveResume,
  APPLY_PLAN_LIMITS,
  RESUME_WORK_FORMAT_LABELS,
  RESUME_EMPLOYMENT_TYPE_LABELS,
} from '@/lib/resume-utils'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'

export const MyResumesClient = observer(function MyResumesClient() {
  const { t } = useTranslation()
  const { resume: store, auth } = useStores()

  useEffect(() => {
    void store.fetchMyResumes()
  }, [store])

  const plan = auth.user?.subscriptionPlan ?? 'free'
  const applyLimit = APPLY_PLAN_LIMITS[plan] ?? 3

  const handlePublish = async (id: string) => {
    await store.publishResume(id)
    if (!store.error) {
      toast.success(t('moderation.toasts.resumeSubmitted'))
    }
  }

  const handleArchive = (id: string) => {
    if (!window.confirm('Архивировать резюме?')) return
    void store.archiveResume(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyResumes(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои резюме</h1>
        <Link
          href="/dashboard/resumes/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Создать резюме
        </Link>
      </div>

      <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        Лимит откликов в день (план {plan}): {applyLimit}
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.myResumes.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас пока нет резюме.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.myResumes.map((r) => (
          <div key={r.documentId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-card-foreground">{r.title}</p>
                  <ResumeStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.firstName} {r.lastName} · {RESUME_WORK_FORMAT_LABELS[r.workFormat]} ·{' '}
                  {RESUME_EMPLOYMENT_TYPE_LABELS[r.employmentType]}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/dashboard/resumes/${r.documentId}/analytics`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Аналитика
                </Link>
                {canEditResume(r.status) && (
                  <Link
                    href={`/dashboard/resumes/${r.documentId}/edit`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    Редактировать
                  </Link>
                )}
                {canPublishResume(r.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handlePublish(r.documentId)}
                    disabled={store.isLoading}
                  >
                    На модерацию
                  </Button>
                )}
                {canArchiveResume(r.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleArchive(r.documentId)}
                    disabled={store.isLoading}
                  >
                    В архив
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{r.views ?? 0} просмотров</span>
              {r.country && (
                <span>
                  {r.country}
                  {r.city ? `, ${r.city}` : ''}
                </span>
              )}
            </div>
            {r.status === 'rejected' && (
              <RejectionNotice
                {...(r.rejectionReason != null ? { reason: r.rejectionReason } : {})}
                {...(r.rejectionComment != null ? { comment: r.rejectionComment } : {})}
                editHref={`/dashboard/resumes/${r.documentId}/edit`}
                onResubmit={() => void handlePublish(r.documentId)}
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
