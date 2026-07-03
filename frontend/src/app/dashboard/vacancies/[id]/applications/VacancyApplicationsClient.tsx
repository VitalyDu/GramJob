'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Users } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { ApplicationCard } from '@/components/application/ApplicationCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import type { ApplicationStatusEnum } from '@/types/api'

interface Props {
  vacancyId: string
}

export const VacancyApplicationsClient = observer(function VacancyApplicationsClient({
  vacancyId,
}: Props) {
  useTelegramBackButton()
  const { application: store } = useStores()
  const isAuthenticated = useRequireAuth()

  useEffect(() => {
    void store.fetchVacancyApplications(vacancyId)
  }, [store, vacancyId])

  const handleStatusChange = (appId: string, status: ApplicationStatusEnum) => {
    void store.updateApplicationStatus(appId, status)
  }

  const handlePageChange = (page: number) => {
    void store.fetchVacancyApplications(vacancyId, page)
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отклики на вакансию"
        {...(store.vacancyTotal > 0 ? { description: `${store.vacancyTotal} откликов` } : {})}
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState
          message={store.error}
          onRetry={() => void store.fetchVacancyApplications(vacancyId)}
        />
      )}

      {!store.isLoading && store.vacancyApplications.length === 0 && !store.error && (
        <EmptyState
          icon={Users}
          title="Нет откликов"
          description="На эту вакансию ещё никто не откликнулся"
        />
      )}

      <div className="space-y-3">
        {store.vacancyApplications.map((app) => (
          <ApplicationCard
            key={app.documentId}
            application={app}
            employerMode
            onStatusChange={handleStatusChange}
            isLoading={store.isLoading}
          />
        ))}
      </div>

      <PaginationBar
        page={store.vacancyPage}
        pageCount={store.vacancyPageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
