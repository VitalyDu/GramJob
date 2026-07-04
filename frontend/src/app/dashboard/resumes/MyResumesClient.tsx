'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { hapticNotify } from '@/lib/telegram'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import {
  canPublishResume,
  canEditResume,
  canArchiveResume,
  APPLY_PLAN_LIMITS,
} from '@/lib/resume-utils'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'

export const MyResumesClient = observer(function MyResumesClient() {
  const { t } = useTranslation()
  const { resume: store, auth } = useStores()
  useRequireAuth()

  useEffect(() => {
    void store.fetchMyResumes()
  }, [store])

  const plan = auth.user?.subscriptionPlan ?? 'free'
  const applyLimit = APPLY_PLAN_LIMITS[plan] ?? 3

  const handlePublish = async (id: string) => {
    await store.publishResume(id)
    if (!store.error) {
      hapticNotify('success')
      toast.success(t('moderation.toasts.resumeSubmitted'))
    }
  }

  const handleArchive = (id: string) => {
    if (!window.confirm(t('dashboard.resumes.confirmArchive'))) return
    void store.archiveResume(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyResumes(page)
  }

  if (!auth.isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.resumes.title')}
        description={t('dashboard.resumes.applyLimitDesc', { plan, limit: applyLimit })}
        actions={
          <Button asChild>
            <Link href="/dashboard/resumes/new">{t('dashboard.resumes.createNew')}</Link>
          </Button>
        }
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchMyResumes()} />
      )}

      {!store.isLoading && store.myResumes.length === 0 && !store.error && (
        <EmptyState
          icon={FileText}
          title={t('dashboard.resumes.empty')}
          description={t('dashboard.resumes.emptyDesc')}
          action={
            <Button asChild>
              <Link href="/dashboard/resumes/new">{t('dashboard.resumes.create')}</Link>
            </Button>
          }
        />
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
                  {r.firstName} {r.lastName} · {t(`enums.resumeWorkFormat.${r.workFormat}`)} ·{' '}
                  {t(`enums.employmentType.${r.employmentType}`)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/dashboard/resumes/${r.documentId}/analytics`}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  {t('dashboard.resumes.analytics')}
                </Link>
                {canEditResume(r.status) && (
                  <Link
                    href={`/dashboard/resumes/${r.documentId}/edit`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    {t('dashboard.resumes.edit')}
                  </Link>
                )}
                {canPublishResume(r.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handlePublish(r.documentId)}
                    disabled={store.isLoading}
                  >
                    {t('dashboard.resumes.toModeration')}
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
                    {t('dashboard.resumes.archive')}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{t('dashboard.resumes.views', { count: r.views ?? 0 })}</span>
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

      <PaginationBar
        page={store.page}
        pageCount={store.pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
