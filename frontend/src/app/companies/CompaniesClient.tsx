'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Building2, Plus } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { CompanyCard } from '@/components/company/CompanyCard'
import { CompanyFilters } from '@/components/company/CompanyFilters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardListSkeleton,
  PaginationBar,
} from '@/components/shared'
import type { Company, CompanyListParams } from '@/types/api'

interface Props {
  initialCompanies?: Company[]
  initialTotal?: number
}

export const CompaniesClient = observer(function CompaniesClient({
  initialCompanies,
  initialTotal,
}: Props) {
  const { company: store, auth } = useStores()
  const { t } = useTranslation()
  const [params, setParams] = useState<CompanyListParams>({ page: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    void store.fetchCompanies({ page: 1 }).finally(() => setLoadedOnce(true))
  }, [store])

  const handleParamsChange = (next: CompanyListParams) => {
    setParams(next)
    void store.fetchCompanies(next)
  }

  const handlePageChange = (page: number) => {
    const next = { ...params, page }
    setParams(next)
    void store.fetchCompanies(next)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const next: CompanyListParams = { ...params, page: 1 }
    if (searchInput) {
      next.search = searchInput
    } else {
      delete next.search
    }
    setParams(next)
    void store.fetchCompanies(next)
  }

  const useInitial =
    !loadedOnce && store.companies.length === 0 && (initialCompanies?.length ?? 0) > 0
  const items = useInitial ? (initialCompanies ?? []) : store.companies
  const total = useInitial ? (initialTotal ?? 0) : store.total
  const page = useInitial ? 1 : store.page
  const pageCount = useInitial ? Math.ceil((initialTotal ?? 0) / 20) : store.pageCount
  const showSkeleton = store.isLoading && items.length === 0

  return (
    <div>
      <PageHeader
        title={t('nav.companies')}
        description={t('companies.description')}
        actions={
          auth.isAuthenticated ? (
            <Button
              asChild
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-full"
              aria-label={t('dashboard.companies.createNew')}
            >
              <Link href="/dashboard/companies/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Поиск — на всю ширину */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <Input
          placeholder={t('companies.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
          aria-label={t('companies.searchPlaceholder')}
        />
        <Button type="submit">{t('common.search')}</Button>
      </form>

      <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
        <aside className="md:sticky md:top-20">
          <CompanyFilters params={params} onChange={handleParamsChange} />
        </aside>

        <section className="mt-4 md:mt-0">
          {showSkeleton && <CardListSkeleton count={6} />}

          {store.error && !store.isLoading && (
            <ErrorState
              message={store.error}
              onRetry={() => void store.fetchCompanies({ page: 1 })}
            />
          )}

          {!store.isLoading && !store.error && items.length === 0 && (
            <EmptyState icon={Building2} title={t('companies.notFound')} />
          )}

          {!showSkeleton && items.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('common.found', { count: total })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((c) => (
                  <CompanyCard key={c.documentId} company={c} />
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
