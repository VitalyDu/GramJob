'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Send } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ApplicationCard } from '@/components/application/ApplicationCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'

export const MyApplicationsClient = observer(function MyApplicationsClient() {
  const { application: store } = useStores()
  const isAuthenticated = useRequireAuth()

  useEffect(() => {
    void store.fetchMyApplications()
  }, [store])

  const handlePageChange = (page: number) => {
    void store.fetchMyApplications(page)
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои отклики"
        {...(store.total > 0 ? { description: `${store.total} откликов` } : {})}
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchMyApplications()} />
      )}

      {!store.isLoading && store.applications.length === 0 && !store.error && (
        <EmptyState
          icon={Send}
          title="Нет откликов"
          description="Вы ещё не откликались на вакансии"
        />
      )}

      <div className="space-y-3">
        {store.applications.map((app) => (
          <ApplicationCard key={app.documentId} application={app} employerMode={false} />
        ))}
      </div>

      <PaginationBar
        page={store.page}
        pageCount={store.pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
