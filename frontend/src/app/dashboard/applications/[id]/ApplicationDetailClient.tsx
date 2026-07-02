'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'

interface Props {
  documentId: string
}

export const ApplicationDetailClient = observer(function ApplicationDetailClient({
  documentId,
}: Props) {
  const { application: store } = useStores()
  useTelegramBackButton()

  useEffect(() => {
    void store.fetchApplicationById(documentId)
  }, [store, documentId])

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (store.error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {store.error}
      </p>
    )
  }

  const app = store.currentApplication
  if (!app) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Отклик</h1>
        <div className="mt-2 flex items-center gap-2">
          <ApplicationStatusBadge status={app.status} />
          <span className="text-xs text-muted-foreground">
            {new Date(app.createdAt).toLocaleDateString('ru', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Вакансия</p>
        <Link
          href={`/vacancies/${app.vacancy.documentId}`}
          className="mt-1 block font-semibold hover:underline"
        >
          {app.vacancy.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted-foreground">{app.vacancy.company.name}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Резюме</p>
        <Link
          href={`/resumes/${app.resume.documentId}`}
          className="mt-1 block font-semibold hover:underline"
        >
          {app.resume.title}
        </Link>
      </div>

      {app.coverLetter && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Сопроводительное письмо</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{app.coverLetter}</p>
        </div>
      )}
    </div>
  )
})
