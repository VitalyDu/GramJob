import Link from 'next/link'
import type { Application, ApplicationStatusEnum } from '@/types/api'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'

const STATUS_TRANSITIONS: Record<ApplicationStatusEnum, ApplicationStatusEnum[]> = {
  applied: ['viewed'],
  viewed: ['in-review'],
  'in-review': ['interview', 'test-task', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  'test-task': ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: [],
}

const NEXT_STATUS_LABELS: Partial<Record<ApplicationStatusEnum, string>> = {
  viewed: 'Просмотрен',
  'in-review': 'На рассмотрение',
  interview: 'Собеседование',
  'test-task': 'Тест. задание',
  offer: 'Оффер',
  hired: 'Принят',
  rejected: 'Отклонить',
}

interface Props {
  application: Application
  employerMode?: boolean
  onStatusChange?: (id: string, status: ApplicationStatusEnum) => void
  isLoading?: boolean
}

export function ApplicationCard({
  application: app,
  employerMode = false,
  onStatusChange,
  isLoading,
}: Props) {
  const nextStatuses = STATUS_TRANSITIONS[app.status] ?? []

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {employerMode ? (
            <>
              <Link
                href={`/resumes/${app.resume.documentId}`}
                className="truncate font-semibold text-card-foreground hover:underline"
              >
                {app.resume.firstName} {app.resume.lastName}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">{app.resume.title}</p>
            </>
          ) : (
            <>
              <Link
                href={`/vacancies/${app.vacancy.documentId}`}
                className="truncate font-semibold text-card-foreground hover:underline"
              >
                {app.vacancy.title}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">{app.vacancy.company.name}</p>
            </>
          )}

          <div className="mt-2 flex items-center gap-2">
            <ApplicationStatusBadge status={app.status} />
            <span className="text-xs text-muted-foreground">
              {new Date(app.createdAt).toLocaleDateString('ru', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {app.coverLetter && !employerMode && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{app.coverLetter}</p>
          )}
        </div>

        {employerMode && onStatusChange && nextStatuses.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {nextStatuses.map((next) => (
              <button
                key={next}
                onClick={() => onStatusChange(app.documentId, next)}
                disabled={isLoading}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  next === 'rejected'
                    ? 'border border-red-200 text-red-600 hover:bg-red-50'
                    : 'border border-border text-foreground hover:bg-muted'
                } disabled:opacity-50`}
              >
                {NEXT_STATUS_LABELS[next] ?? next}
              </button>
            ))}
          </div>
        )}
      </div>

      {employerMode && app.coverLetter && (
        <div className="mt-3 rounded-lg bg-muted px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Сопроводительное письмо</p>
          <p className="mt-1 text-sm text-foreground">{app.coverLetter}</p>
        </div>
      )}
    </div>
  )
}
