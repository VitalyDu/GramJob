'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Building2 } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { CompanyCard } from '@/components/company/CompanyCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardListSkeleton,
  PaginationBar,
} from '@/components/shared'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountrySelect } from '@/components/ui/country-select'
import type { CompanySizeEnum } from '@/types/api'

export const CompaniesClient = observer(function CompaniesClient() {
  const { company: store } = useStores()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')
  const [companySize, setCompanySize] = useState<CompanySizeEnum | ''>('')

  useEffect(() => {
    void store.fetchCompanies({ page: 1 })
  }, [store])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void store.fetchCompanies({
      page: 1,
      ...(search ? { search } : {}),
      ...(country ? { country } : {}),
      ...(companySize ? { companySize } : {}),
    })
  }

  const handlePageChange = (page: number) => {
    void store.fetchCompanies({
      page,
      ...(search ? { search } : {}),
      ...(country ? { country } : {}),
      ...(companySize ? { companySize } : {}),
    })
  }

  return (
    <div>
      <PageHeader title="Компании" description="Каталог работодателей" />

      {/* Поиск — на всю ширину */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <Input
          placeholder="Поиск компании..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          aria-label="Поиск компании"
        />
        <Button type="submit">Найти</Button>
      </form>

      <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
        <aside className="md:sticky md:top-20">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="space-y-1.5">
              <Label>Страна</Label>
              <CountrySelect value={country} onChange={setCountry} placeholder="Любая страна" />
            </div>
            <Select
              value={companySize || '__all__'}
              onValueChange={(v) => setCompanySize(v === '__all__' ? '' : (v as CompanySizeEnum))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Любой размер</SelectItem>
                {(Object.entries(COMPANY_SIZE_LABELS) as [CompanySizeEnum, string][]).map(
                  ([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
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
            <EmptyState icon={Building2} title="Компании не найдены" />
          )}

          {!store.isLoading && store.companies.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Найдено: {store.total}</p>
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
