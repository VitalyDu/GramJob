'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ApplicationCard } from '@/components/application/ApplicationCard'
import { Button } from '@/components/ui/button'
import type { ApplicationStatusEnum } from '@/types/api'

interface Props {
  vacancyId: string
}

export const VacancyApplicationsClient = observer(function VacancyApplicationsClient({
  vacancyId,
}: Props) {
  const { application: store } = useStores()

  useEffect(() => {
    void store.fetchVacancyApplications(vacancyId)
  }, [store, vacancyId])

  const handleStatusChange = (appId: string, status: ApplicationStatusEnum) => {
    void store.updateApplicationStatus(appId, status)
  }

  const handlePageChange = (page: number) => {
    void store.fetchVacancyApplications(vacancyId, page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/vacancies"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Отклики на вакансию</h1>
      </div>

      {store.vacancyTotal > 0 && (
        <p className="text-sm text-muted-foreground">{store.vacancyTotal} откликов</p>
      )}

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.vacancyApplications.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Откликов пока нет.</p>
        </div>
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

      {store.vacancyPageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.vacancyPage <= 1}
            onClick={() => handlePageChange(store.vacancyPage - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.vacancyPage} / {store.vacancyPageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.vacancyPage >= store.vacancyPageCount}
            onClick={() => handlePageChange(store.vacancyPage + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
