'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { StatusBadge } from '@/components/company/StatusBadge'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PlanLimitsCard } from '@/components/subscription/PlanLimitsCard'

const STATUS_HINT_KEYS: Record<string, string> = {
  draft: 'publications.hints.draft',
  moderation: 'publications.hints.moderation',
  published: 'publications.hints.published',
  expired: 'publications.hints.expired',
  archived: 'publications.hints.archived',
}

export const PublicationsClient = observer(function PublicationsClient() {
  const { t } = useTranslation()
  const { vacancy, resume, company } = useStores()
  const isAuthenticated = useRequireAuth()

  useEffect(() => {
    void vacancy.fetchMyVacancies()
    void resume.fetchMyResumes()
    void company.fetchMyCompanies(1)
  }, [vacancy, resume, company])

  const isLoading = vacancy.isLoading || resume.isLoading || company.isLoading
  const isEmpty =
    !isLoading &&
    vacancy.myVacancies.length === 0 &&
    resume.myResumes.length === 0 &&
    company.myCompanies.length === 0

  const resubmitVacancy = async (id: string) => {
    await vacancy.publishVacancy(id)
    if (!vacancy.error && !vacancy.limitReached) {
      toast.success(t('moderation.toasts.vacancySubmitted'))
    }
  }

  const resubmitResume = async (id: string) => {
    await resume.publishResume(id)
    if (!resume.error) {
      toast.success(t('moderation.toasts.resumeSubmitted'))
    }
  }

  const resubmitCompany = async (id: string) => {
    await company.submitCompany(id)
    if (!company.error) {
      toast.success(t('moderation.toasts.companySubmitted'))
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader title={t('publications.title')} />

      <PlanLimitsCard />

      {isLoading && <CardListSkeleton count={6} />}

      {isEmpty && (
        <EmptyState
          icon={FileText}
          title={t('publications.empty')}
          description={t('dashboard.publications.emptyDesc')}
        />
      )}

      {vacancy.myVacancies.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-wrap items-center justify-between gap-y-2">
              <CardTitle className="flex items-center gap-2">
                {t('publications.vacancies')}
                <Badge variant="secondary">{vacancy.myVacancies.length}</Badge>
              </CardTitle>
              <Link href="/dashboard/vacancies" className="text-sm text-primary hover:underline">
                {t('publications.all')}
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {vacancy.myVacancies.map((v) => (
              <div key={v.documentId} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{v.title}</p>
                  <VacancyStatusBadge status={v.moderationStatus} />
                </div>
                {v.moderationStatus !== 'rejected' && STATUS_HINT_KEYS[v.moderationStatus] && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(STATUS_HINT_KEYS[v.moderationStatus]!)}
                  </p>
                )}
                {v.moderationStatus === 'rejected' && (
                  <RejectionNotice
                    {...(v.rejectionReason != null ? { reason: v.rejectionReason } : {})}
                    {...(v.rejectionComment != null ? { comment: v.rejectionComment } : {})}
                    editHref={`/dashboard/vacancies/${v.documentId}/edit`}
                    onResubmit={() => void resubmitVacancy(v.documentId)}
                    resubmitDisabled={vacancy.isLoading}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {resume.myResumes.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-wrap items-center justify-between gap-y-2">
              <CardTitle className="flex items-center gap-2">
                {t('publications.resumes')}
                <Badge variant="secondary">{resume.myResumes.length}</Badge>
              </CardTitle>
              <Link href="/dashboard/resumes" className="text-sm text-primary hover:underline">
                {t('publications.all')}
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {resume.myResumes.map((r) => (
              <div key={r.documentId} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{r.title}</p>
                  <ResumeStatusBadge status={r.moderationStatus} />
                </div>
                {r.moderationStatus !== 'rejected' && STATUS_HINT_KEYS[r.moderationStatus] && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(STATUS_HINT_KEYS[r.moderationStatus]!)}
                  </p>
                )}
                {r.moderationStatus === 'rejected' && (
                  <RejectionNotice
                    {...(r.rejectionReason != null ? { reason: r.rejectionReason } : {})}
                    {...(r.rejectionComment != null ? { comment: r.rejectionComment } : {})}
                    editHref={`/dashboard/resumes/${r.documentId}/edit`}
                    onResubmit={() => void resubmitResume(r.documentId)}
                    resubmitDisabled={resume.isLoading}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {company.myCompanies.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-wrap items-center justify-between gap-y-2">
              <CardTitle className="flex items-center gap-2">
                {t('publications.companies')}
                <Badge variant="secondary">{company.myCompanies.length}</Badge>
              </CardTitle>
              <Link href="/dashboard/companies" className="text-sm text-primary hover:underline">
                {t('publications.all')}
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {company.myCompanies.map((c) => (
              <div key={c.documentId} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{c.name}</p>
                  <StatusBadge status={c.moderationStatus} />
                </div>
                {c.moderationStatus !== 'rejected' && STATUS_HINT_KEYS[c.moderationStatus] && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(STATUS_HINT_KEYS[c.moderationStatus]!)}
                  </p>
                )}
                {c.moderationStatus === 'rejected' && (
                  <RejectionNotice
                    {...(c.rejectionReason != null ? { reason: c.rejectionReason } : {})}
                    {...(c.rejectionComment != null ? { comment: c.rejectionComment } : {})}
                    editHref={`/dashboard/companies/${c.documentId}/edit`}
                    onResubmit={() => void resubmitCompany(c.documentId)}
                    resubmitDisabled={company.isLoading}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
})
