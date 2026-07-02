'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
import { BlockButton } from '@/components/block/BlockButton'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import { SALARY_CURRENCY_SYMBOLS } from '@/lib/vacancy-utils'
import type { SalaryCurrencyEnum } from '@/types/api'

interface Props {
  id: string
}

export const ResumeDetailClient = observer(function ResumeDetailClient({ id }: Props) {
  useTelegramBackButton()
  const { resume: store, auth } = useStores()
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    void store.fetchResumeById(id)
  }, [store, id])

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (store.accessDenied) {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-semibold text-card-foreground">
          Просмотр резюме доступен на плане Max
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {auth.user
            ? 'Оформите подписку Max или VIP, чтобы просматривать резюме кандидатов.'
            : 'Войдите и оформите подписку Max или VIP, чтобы просматривать резюме кандидатов.'}
        </p>
        <Link
          href={auth.user ? '/subscription' : '/login'}
          className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {auth.user ? 'Перейти к подпискам →' : 'Войти →'}
        </Link>
      </div>
    )
  }

  if (!store.currentResume) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-card-foreground">Резюме не найдено</p>
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
          <h1 className="text-2xl font-bold text-card-foreground">{r.title}</h1>
          <ResumeStatusBadge status={r.status} />
        </div>
        <p className="mt-1 text-base font-medium text-foreground">{name}</p>

        {auth.user && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FavoriteButton type="resume" targetId={id} />
            <button
              onClick={() => setReportOpen(true)}
              className="text-sm text-muted-foreground hover:text-red-500"
            >
              Пожаловаться
            </button>
            {r.user && <BlockButton targetType="candidate" targetId={r.user.id} />}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
          <p className="mt-3 text-lg font-semibold text-card-foreground">
            от {salarySymbol}
            {r.desiredSalary.toLocaleString('ru')}
          </p>
        )}
      </div>

      {r.about && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-card-foreground">О себе</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground">{r.about}</p>
        </div>
      )}

      {r.skills && r.skills.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-card-foreground">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {r.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {r.workExperience && r.workExperience.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-card-foreground">Опыт работы</h2>
          <div className="space-y-4">
            {r.workExperience.map((w, i) => (
              <div key={i} className="rounded-xl border border-border p-4">
                <p className="font-medium text-card-foreground">{w.position}</p>
                <p className="text-sm text-muted-foreground">{w.company}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {w.startDate} — {w.current ? 'по настоящее время' : (w.endDate ?? '')}
                </p>
                {w.description && <p className="mt-2 text-sm text-foreground">{w.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {r.education && r.education.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-card-foreground">Образование</h2>
          <div className="space-y-4">
            {r.education.map((e, i) => (
              <div key={i} className="rounded-xl border border-border p-4">
                <p className="font-medium text-card-foreground">
                  {e.degree} — {e.field}
                </p>
                <p className="text-sm text-muted-foreground">{e.institution}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.startDate} — {e.current ? 'по настоящее время' : (e.endDate ?? '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.contacts && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-card-foreground">Контакты</h2>
          <div className="space-y-1 text-sm text-foreground">
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

      <ReportDialog
        type="resume"
        targetId={id}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
})
