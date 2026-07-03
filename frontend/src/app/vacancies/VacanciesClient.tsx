'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Briefcase, Search } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import { VacancyFilters } from '@/components/vacancy/VacancyFilters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SaveSearchButton } from '@/components/saved-search/SaveSearchButton'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardListSkeleton,
  PaginationBar,
} from '@/components/shared'
import type { VacancyListParams } from '@/types/api'

export const VacanciesClient = observer(function VacanciesClient() {
  const { vacancy: store } = useStores()
  const [params, setParams] = useState<VacancyListParams>({ page: 1 })
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    void store.fetchVacancies({ page: 1 })
  }, [store])

  const handleParamsChange = (next: VacancyListParams) => {
    setParams(next)
    void store.fetchVacancies(next)
  }

  const handlePageChange = (page: number) => {
    const next = { ...params, page }
    setParams(next)
    void store.fetchVacancies(next)
  }

  const handleReset = () => {
    handleParamsChange({ page: 1 })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const next: VacancyListParams = { ...params, page: 1 }
    if (searchInput) {
      next.search = searchInput
    } else {
      delete next.search
    }
    setParams(next)
    void store.fetchVacancies(next)
  }

  return (
    <div>
      <PageHeader title="Вакансии" description="Найдите работу мечты в Telegram-экосистеме" />

      {/* Поиск — на всю ширину, над сеткой */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Поиск вакансий..."
          className="flex-1"
          aria-label="Поиск вакансий"
        />
        <Button type="submit">
          <Search className="mr-1.5 h-4 w-4" />
          Найти
        </Button>
      </form>

      <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
        <aside className="md:sticky md:top-20">
          <VacancyFilters params={params} onChange={handleParamsChange} />
          <div className="mt-3 hidden md:block">
            <SaveSearchButton
              searchType="vacancy"
              filters={params as Record<string, string | number | boolean | undefined>}
            />
          </div>
        </aside>

        <section className="mt-4 md:mt-0">
          <div className="mb-3 md:hidden">
            <SaveSearchButton
              searchType="vacancy"
              filters={params as Record<string, string | number | boolean | undefined>}
            />
          </div>

          {store.isLoading && <CardListSkeleton count={6} />}

          {store.error && !store.isLoading && (
            <ErrorState message={store.error} onRetry={() => void store.fetchVacancies(params)} />
          )}

          {!store.isLoading && !store.error && store.vacancies.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title="Вакансии не найдены"
              description="Попробуйте изменить фильтры"
              action={<Button onClick={handleReset}>Сбросить фильтры</Button>}
            />
          )}

          {!store.isLoading && store.vacancies.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Найдено: {store.total}</p>
              <div className="space-y-3">
                {store.vacancies.map((v) => (
                  <VacancyCard key={v.documentId} vacancy={v} />
                ))}
              </div>
              <PaginationBar
                page={store.page}
                pageCount={store.pageCount}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
})
