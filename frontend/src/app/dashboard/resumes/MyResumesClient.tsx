'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { Archive, BarChart2, Eye, FileText, MoreVertical, Pencil, Plus, Send } from 'lucide-react'
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
import { EntityActionsDrawer } from '@/components/shared/EntityActionsDrawer'
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

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeResume = activeId ? store.myResumes.find((r) => r.documentId === activeId) : null

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
          <Button
            asChild
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label={t('dashboard.resumes.createNew')}
          >
            <Link href="/dashboard/resumes/new">
              <Plus className="h-4 w-4" />
            </Link>
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
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-card-foreground">{r.title}</p>
                  <ResumeStatusBadge status={r.moderationStatus} />
                </div>
                {(r.firstName || r.lastName) && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[r.firstName, r.lastName].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label={t('actions.openActions')}
                onClick={() => {
                  setActiveId(r.documentId)
                  setDrawerOpen(true)
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{t('dashboard.resumes.views', { count: r.views ?? 0 })}</span>
              {r.country && (
                <span>
                  {r.country}
                  {r.city ? `, ${r.city}` : ''}
                </span>
              )}
            </div>
            {r.moderationStatus === 'rejected' && (
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

      {activeResume && (
        <EntityActionsDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={activeResume.title}
          statusBadge={<ResumeStatusBadge status={activeResume.moderationStatus} />}
          actions={[
            {
              id: 'view',
              icon: Eye,
              label: t('actions.view'),
              description: t('actions.viewDesc'),
              href: `/resumes/${activeResume.documentId}`,
            },
            {
              id: 'analytics',
              icon: BarChart2,
              label: t('actions.analytics'),
              description: t('actions.analyticsDesc'),
              href: `/dashboard/resumes/${activeResume.documentId}/analytics`,
            },
            ...(canEditResume(activeResume.moderationStatus)
              ? [
                  {
                    id: 'edit',
                    icon: Pencil,
                    label: t('actions.edit'),
                    description: t('actions.editDesc'),
                    href: `/dashboard/resumes/${activeResume.documentId}/edit`,
                  },
                ]
              : []),
            ...(canPublishResume(activeResume.moderationStatus)
              ? [
                  {
                    id: 'publish',
                    icon: Send,
                    label: t('actions.toModeration'),
                    description: t('actions.toModerationDesc'),
                    onClick: () => void handlePublish(activeResume.documentId),
                    disabled: store.isLoading,
                  },
                ]
              : []),
            ...(canArchiveResume(activeResume.moderationStatus)
              ? [
                  {
                    id: 'archive',
                    icon: Archive,
                    label: t('actions.archive'),
                    description: t('actions.archiveDesc'),
                    onClick: () => handleArchive(activeResume.documentId),
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
