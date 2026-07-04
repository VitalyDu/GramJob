'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
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
import type { CompanyListParams } from '@/types/api'

export const CompaniesClient = observer(function CompaniesClient() {
  const { company: store } = useStores()
  const { t } = useTranslation()
  const [params, setParams] = useState<CompanyListParams>({ page: 1 })
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    void store.fetchCompanies({ page: 1 })
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

  return (
    <div>
      <PageHeader title={t('nav.companies')} description={t('companies.description')} />

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
          {store.isLoading && <CardListSkeleton count={6} />}

          {store.error && !store.isLoading && (
            <ErrorState
              message={store.error}
              onRetry={() => void store.fetchCompanies({ page: 1 })}
            />
          )}

          {!store.isLoading && !store.error && store.companies.length === 0 && (
            <EmptyState icon={Building2} title={t('companies.notFound')} />
          )}

          {!store.isLoading && store.companies.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('common.found', { count: store.total })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {store.companies.map((c) => (
                  <CompanyCard key={c.documentId} company={c} />
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
