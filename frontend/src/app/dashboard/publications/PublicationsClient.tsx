'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { StatusBadge } from '@/components/company/StatusBadge'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'

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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('publications.title')}</h1>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">{t('publications.empty')}</p>
        </div>
      )}

      {vacancy.myVacancies.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('publications.vacancies')}</h2>
            <Link href="/dashboard/vacancies" className="text-sm text-indigo-600 hover:underline">
              {t('publications.all')}
            </Link>
          </div>
          {vacancy.myVacancies.map((v) => (
            <div key={v.documentId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-card-foreground">{v.title}</p>
                <VacancyStatusBadge status={v.status} />
              </div>
              {v.status !== 'rejected' && STATUS_HINT_KEYS[v.status] && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(STATUS_HINT_KEYS[v.status]!)}
                </p>
              )}
              {v.status === 'rejected' && (
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
        </section>
      )}

      {resume.myResumes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('publications.resumes')}</h2>
            <Link href="/dashboard/resumes" className="text-sm text-indigo-600 hover:underline">
              {t('publications.all')}
            </Link>
          </div>
          {resume.myResumes.map((r) => (
            <div key={r.documentId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-card-foreground">{r.title}</p>
                <ResumeStatusBadge status={r.status} />
              </div>
              {r.status !== 'rejected' && STATUS_HINT_KEYS[r.status] && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(STATUS_HINT_KEYS[r.status]!)}
                </p>
              )}
              {r.status === 'rejected' && (
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
        </section>
      )}

      {company.myCompanies.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('publications.companies')}</h2>
            <Link href="/dashboard/companies" className="text-sm text-indigo-600 hover:underline">
              {t('publications.all')}
            </Link>
          </div>
          {company.myCompanies.map((c) => (
            <div key={c.documentId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-card-foreground">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              {c.status !== 'rejected' && STATUS_HINT_KEYS[c.status] && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(STATUS_HINT_KEYS[c.status]!)}
                </p>
              )}
              {c.status === 'rejected' && (
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
        </section>
      )}
    </div>
  )
})
