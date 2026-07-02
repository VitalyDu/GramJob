'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { StatusBadge } from '@/components/company/StatusBadge'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'

const STATUS_HINTS: Record<string, string> = {
  draft: 'Черновик — заполните и отправьте на модерацию.',
  moderation: 'Ожидает проверки модератором. Обычно это занимает до 24 часов.',
  published: 'Опубликовано и видно всем пользователям.',
  expired: 'Срок публикации истёк. Отправьте повторно, чтобы вернуть в поиск.',
  archived: 'В архиве — не отображается в поиске.',
}

export const PublicationsClient = observer(function PublicationsClient() {
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
      toast.success('Вакансия отправлена на модерацию')
    }
  }

  const resubmitResume = async (id: string) => {
    await resume.publishResume(id)
    if (!resume.error) {
      toast.success('Резюме отправлено на модерацию')
    }
  }

  const resubmitCompany = async (id: string) => {
    await company.submitCompany(id)
    if (!company.error) {
      toast.success('Компания отправлена на модерацию')
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Мои публикации</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас пока нет публикаций.</p>
        </div>
      )}

      {vacancy.myVacancies.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Вакансии</h2>
            <Link href="/dashboard/vacancies" className="text-sm text-indigo-600 hover:underline">
              Все →
            </Link>
          </div>
          {vacancy.myVacancies.map((v) => (
            <div key={v.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-gray-900">{v.title}</p>
                <VacancyStatusBadge status={v.status} />
              </div>
              {v.status !== 'rejected' && STATUS_HINTS[v.status] && (
                <p className="mt-1 text-sm text-gray-500">{STATUS_HINTS[v.status]}</p>
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
            <h2 className="text-lg font-semibold">Резюме</h2>
            <Link href="/dashboard/resumes" className="text-sm text-indigo-600 hover:underline">
              Все →
            </Link>
          </div>
          {resume.myResumes.map((r) => (
            <div key={r.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-gray-900">{r.title}</p>
                <ResumeStatusBadge status={r.status} />
              </div>
              {r.status !== 'rejected' && STATUS_HINTS[r.status] && (
                <p className="mt-1 text-sm text-gray-500">{STATUS_HINTS[r.status]}</p>
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
            <h2 className="text-lg font-semibold">Компании</h2>
            <Link href="/dashboard/companies" className="text-sm text-indigo-600 hover:underline">
              Все →
            </Link>
          </div>
          {company.myCompanies.map((c) => (
            <div key={c.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-gray-900">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              {c.status !== 'rejected' && STATUS_HINTS[c.status] && (
                <p className="mt-1 text-sm text-gray-500">{STATUS_HINTS[c.status]}</p>
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
