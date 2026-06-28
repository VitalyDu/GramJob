'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import { SALARY_CURRENCY_SYMBOLS } from '@/lib/vacancy-utils'
import type { SalaryCurrencyEnum } from '@/types/api'

interface Props {
  id: string
}

export const ResumeDetailClient = observer(function ResumeDetailClient({ id }: Props) {
  const { resume: store } = useStores()

  useEffect(() => {
    void store.fetchResumeById(id)
  }, [store, id])

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (!store.currentResume) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Резюме не найдено</p>
        {store.error && <p className="mt-1 text-sm text-muted-foreground">{store.error}</p>}
        <Link href="/resumes" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Все резюме
        </Link>
      </div>
    )
  }

  const r = store.currentResume
  const name = `${r.firstName} ${r.lastName}`
  const salarySymbol = r.currency
    ? (SALARY_CURRENCY_SYMBOLS[r.currency as SalaryCurrencyEnum] ?? '')
    : ''

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{r.title}</h1>
          <ResumeStatusBadge status={r.status} />
        </div>
        <p className="mt-1 text-base font-medium text-gray-700">{name}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
          <span>
            {r.country}
            {r.city ? `, ${r.city}` : ''}
          </span>
          <span>{RESUME_WORK_FORMAT_LABELS[r.workFormat]}</span>
          <span>{RESUME_EMPLOYMENT_TYPE_LABELS[r.employmentType]}</span>
          {r.experienceYears !== null && r.experienceYears !== undefined && (
            <span>{r.experienceYears} лет опыта</span>
          )}
        </div>

        {r.desiredSalary && (
          <p className="mt-3 text-lg font-semibold text-gray-900">
            от {salarySymbol}
            {r.desiredSalary.toLocaleString('ru')}
          </p>
        )}
      </div>

      {r.about && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">О себе</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{r.about}</p>
        </div>
      )}

      {r.skills && r.skills.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {r.skills.map((skill) => (
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

      {r.workExperience && r.workExperience.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Опыт работы</h2>
          <div className="space-y-4">
            {r.workExperience.map((w, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4">
                <p className="font-medium text-gray-900">{w.position}</p>
                <p className="text-sm text-gray-600">{w.company}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {w.startDate} — {w.current ? 'по настоящее время' : (w.endDate ?? '')}
                </p>
                {w.description && <p className="mt-2 text-sm text-gray-700">{w.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {r.education && r.education.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Образование</h2>
          <div className="space-y-4">
            {r.education.map((e, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4">
                <p className="font-medium text-gray-900">
                  {e.degree} — {e.field}
                </p>
                <p className="text-sm text-gray-600">{e.institution}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {e.startDate} — {e.current ? 'по настоящее время' : (e.endDate ?? '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.contacts && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Контакты</h2>
          <div className="space-y-1 text-sm text-gray-700">
            {r.contacts.telegram && (
              <p>
                Telegram:{' '}
                <a
                  href={`https://t.me/${r.contacts.telegram.replace('@', '')}`}
                  className="text-primary hover:underline"
                >
                  {r.contacts.telegram}
                </a>
              </p>
            )}
            {r.contacts.email && (
              <p>
                Email:{' '}
                <a href={`mailto:${r.contacts.email}`} className="text-primary hover:underline">
                  {r.contacts.email}
                </a>
              </p>
            )}
            {r.contacts.phone && <p>Телефон: {r.contacts.phone}</p>}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <Link href="/resumes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Все резюме
        </Link>
      </div>
    </div>
  )
})
