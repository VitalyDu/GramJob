'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'

interface Props {
  documentId: string
}

export const ApplicationDetailClient = observer(function ApplicationDetailClient({
  documentId,
}: Props) {
  const { t } = useTranslation()
  const { application: store } = useStores()
  const isAuthenticated = useRequireAuth()
  useTelegramBackButton()

  useEffect(() => {
    void store.fetchApplicationById(documentId)
  }, [store, documentId])

  if (store.isLoading) {
    return <CardListSkeleton count={3} />
  }

  if (store.error) {
    return (
      <ErrorState
        message={store.error}
        onRetry={() => void store.fetchApplicationById(documentId)}
      />
    )
  }

  if (!isAuthenticated) return null

  const app = store.currentApplication
  if (!app) return null

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.applicationDetail.title')} />

      <div className="flex items-center gap-2">
        <ApplicationStatusBadge status={app.status} />
        <span className="text-xs text-muted-foreground">
          {new Date(app.createdAt).toLocaleDateString('ru', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs font-medium text-muted-foreground">
            {t('dashboard.applicationDetail.vacancy')}
          </p>
          <Link
            href={`/vacancies/${app.vacancy.documentId}`}
            className="mt-1 block font-semibold hover:underline"
          >
            {app.vacancy.title}
          </Link>
          <p className="mt-0.5 text-sm text-muted-foreground">{app.vacancy.company.name}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs font-medium text-muted-foreground">
            {t('dashboard.applicationDetail.resume')}
          </p>
          <Link
            href={`/resumes/${app.resume.documentId}`}
            className="mt-1 block font-semibold hover:underline"
          >
            {app.resume.title}
          </Link>
        </CardContent>
      </Card>

      {app.coverLetter && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">
              {t('dashboard.applicationDetail.coverLetter')}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{app.coverLetter}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
})
