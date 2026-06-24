'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { CompanyCard } from '@/components/company/CompanyCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const CompaniesClient = observer(function CompaniesClient() {
  const { company: store } = useStores()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    void store.fetchCompanies({ page: 1 })
  }, [store])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = { page: 1, ...(search && { search }), ...(country && { country }) }
    void store.fetchCompanies(params)
  }

  const handlePageChange = (page: number) => {
    const params = { page, ...(search && { search }), ...(country && { country }) }
    void store.fetchCompanies(params)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск компании..."
          className="max-w-sm"
        />
        <Input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Страна (RU, US...)"
          className="max-w-[140px]"
        />
        <Button type="submit">Найти</Button>
      </form>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.companies.length === 0 && !store.error && (
        <p className="text-sm text-muted-foreground">Компании не найдены.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {store.companies.map((c) => (
          <CompanyCard key={c.documentId} company={c} />
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
