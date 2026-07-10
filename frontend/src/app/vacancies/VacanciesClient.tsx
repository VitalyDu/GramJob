'use client'

import { useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Briefcase, Plus, Search } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import { VacancyFilters } from '@/components/vacancy/VacancyFilters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardListSkeleton,
  PaginationBar,
} from '@/components/shared'
import { parseVacancySearchParams } from '@/lib/search-params'
import type { Vacancy, VacancyListParams } from '@/types/api'

interface Props {
  initialVacancies?: Vacancy[]
  initialTotal?: number
}

export const VacanciesClient = observer(function VacanciesClient({
  initialVacancies,
  initialTotal,
}: Props) {
  const { vacancy: store, auth } = useStores()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const initialParamsRef = useRef<VacancyListParams | null>(null)
  if (initialParamsRef.current === null) {
    initialParamsRef.current = parseVacancySearchParams(searchParams)
  }
  const [params, setParams] = useState<VacancyListParams>(initialParamsRef.current)
  const [searchInput, setSearchInput] = useState(initialParamsRef.current.search ?? '')
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    void store
      .fetchVacancies(initialParamsRef.current ?? { page: 1 })
      .finally(() => setLoadedOnce(true))
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

  const useInitial =
    !loadedOnce && store.vacancies.length === 0 && (initialVacancies?.length ?? 0) > 0
  const items = useInitial ? (initialVacancies ?? []) : store.vacancies
  const total = useInitial ? (initialTotal ?? 0) : store.total
  const page = useInitial ? 1 : store.page
  const pageCount = useInitial ? Math.ceil((initialTotal ?? 0) / 20) : store.pageCount
  const showSkeleton = store.isLoading && items.length === 0

  return (
    <div>
      <PageHeader
        title={t('nav.vacancies')}
        description={t('vacancies.description')}
        actions={
          auth.isAuthenticated ? (
            <Button
              asChild
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-full"
              aria-label={t('dashboard.vacancies.createNew')}
            >
              <Link href="/dashboard/vacancies/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Поиск — на всю ширину, над сеткой */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('vacancies.searchPlaceholder')}
          className="flex-1"
          aria-label={t('vacancies.searchPlaceholder')}
        />
        <Button type="submit">
          <Search className="mr-1.5 h-4 w-4" />
          {t('common.search')}
        </Button>
      </form>

      <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
        <aside className="md:sticky md:top-20">
          <VacancyFilters params={params} onChange={handleParamsChange} />
        </aside>

        <section className="mt-4 md:mt-0">
          {showSkeleton && <CardListSkeleton count={6} />}

          {store.error && !store.isLoading && (
            <ErrorState message={store.error} onRetry={() => void store.fetchVacancies(params)} />
          )}

          {!store.isLoading && !store.error && items.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title={t('vacancies.notFound')}
              description={t('vacancies.notFoundHint')}
              action={<Button onClick={handleReset}>{t('common.resetFilters')}</Button>}
            />
          )}

          {!showSkeleton && items.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('common.found', { count: total })}
              </p>
              <div className="space-y-3">
                {items.map((v) => (
                  <VacancyCard key={v.documentId} vacancy={v} />
                ))}
              </div>
              <PaginationBar page={page} pageCount={pageCount} onPageChange={handlePageChange} />
            </>
          )}
        </section>
      </div>
    </div>
  )
})
