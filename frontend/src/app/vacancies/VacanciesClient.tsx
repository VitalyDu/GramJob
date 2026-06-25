'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import { VacancyFilters } from '@/components/vacancy/VacancyFilters'
import { Button } from '@/components/ui/button'
import type { VacancyListParams } from '@/types/api'

export const VacanciesClient = observer(function VacanciesClient() {
  const { vacancy: store } = useStores()
  const [params, setParams] = useState<VacancyListParams>({ page: 1 })

  useEffect(() => {
    void store.fetchVacancies({ page: 1 })
  }, [store])

  const handleFiltersChange = (next: VacancyListParams) => {
    setParams(next)
    void store.fetchVacancies(next)
  }

  const handlePageChange = (page: number) => {
    const next = { ...params, page }
    setParams(next)
    void store.fetchVacancies(next)
  }

  return (
    <div className="space-y-6">
      <VacancyFilters params={params} onChange={handleFiltersChange} />

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.vacancies.length === 0 && !store.error && (
        <p className="text-sm text-muted-foreground">Вакансии не найдены.</p>
      )}

      <div className="grid gap-3">
        {store.vacancies.map((v) => (
          <VacancyCard key={v.documentId} vacancy={v} />
        ))}
      </div>

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.page <= 1}
            onClick={() => handlePageChange(store.page - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.page} / {store.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.page >= store.pageCount}
            onClick={() => handlePageChange(store.page + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
