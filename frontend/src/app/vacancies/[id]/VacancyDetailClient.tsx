'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { ApplyDialog } from '@/components/application/ApplyDialog'
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
import { BlockButton } from '@/components/block/BlockButton'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  formatSalary,
} from '@/lib/vacancy-utils'

interface Props {
  id: string
}

export const VacancyDetailClient = observer(function VacancyDetailClient({ id }: Props) {
  const { vacancy: store, application: appStore, auth } = useStores()
  const [applyOpen, setApplyOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    void store.fetchVacancyById(id)
  }, [store, id])

  const handleApplyClose = () => {
    setApplyOpen(false)
    appStore.clearFlags()
  }

  const handleApplySubmit = async (resumeId: string, coverLetter: string) => {
    try {
      await appStore.createApplication({ vacancyId: id, resumeId, coverLetter })
      setApplyOpen(false)
    } catch {
      // errors reflected in appStore.limitReached / appStore.alreadyApplied
    }
  }

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (!store.currentVacancy) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Вакансия не найдена</p>
        {store.error && <p className="mt-1 text-sm text-muted-foreground">{store.error}</p>}
        <Link href="/vacancies" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Все вакансии
        </Link>
      </div>
    )
  }

  const v = store.currentVacancy
  const salary = formatSalary(v.salaryFrom, v.salaryTo, v.salaryCurrency)
  const isInternal = v.sourceType === 'internal'
  const isPublished = v.status === 'published'

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{v.title}</h1>
          <VacancyStatusBadge status={v.status} />
        </div>

        {v.company && (
          <Link
            href={`/companies/${v.company.documentId}`}
            className="mt-1 text-sm font-medium text-primary hover:underline"
          >
            {v.company.name}
          </Link>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
          <span>
            {v.country}
            {v.city ? `, ${v.city}` : ''}
          </span>
          <span>{WORK_FORMAT_LABELS[v.workFormat]}</span>
          <span>{EMPLOYMENT_TYPE_LABELS[v.employmentType]}</span>
          <span>{SENIORITY_LABELS[v.seniority]}</span>
        </div>

        {salary && <p className="mt-3 text-lg font-semibold text-gray-900">{salary}</p>}

        {v.urgent && (
          <span className="mt-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            🔥 Urgent
          </span>
        )}

        {auth.user && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FavoriteButton type="vacancy" targetId={id} />
            <button
              onClick={() => setReportOpen(true)}
              className="text-sm text-gray-500 hover:text-red-500"
            >
              Пожаловаться
            </button>
            {v.postedBy && <BlockButton targetType="employer" targetId={v.postedBy.id} />}
          </div>
        )}
      </div>

      {v.description && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Описание</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.description}</p>
        </div>
      )}

      {v.responsibilities && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Обязанности</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.responsibilities}</p>
        </div>
      )}

      {v.requirements && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Требования</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.requirements}</p>
        </div>
      )}

      {v.conditions && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Условия</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.conditions}</p>
        </div>
      )}

      {v.skills && v.skills.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {v.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {isPublished && isInternal && auth.user && (
        <button
          onClick={() => setApplyOpen(true)}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Откликнуться
        </button>
      )}

      {isPublished && isInternal && !auth.user && (
        <Link
          href="/login"
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Войдите, чтобы откликнуться
        </Link>
      )}

      {v.sourceType === 'external' && v.sourceUrl && (
        <a
          href={v.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Apply on Source →
        </a>
      )}

      <div className="border-t pt-4">
        <Link href="/vacancies" className="text-sm text-muted-foreground hover:text-foreground">
          ← Все вакансии
        </Link>
      </div>

      <ApplyDialog
        isOpen={applyOpen}
        vacancyId={id}
        vacancyTitle={v.title}
        onClose={handleApplyClose}
        onSubmit={handleApplySubmit}
        isLoading={appStore.isLoading}
        limitReached={appStore.limitReached}
        alreadyApplied={appStore.alreadyApplied}
      />

      <ReportDialog
        type="vacancy"
        targetId={id}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
})
