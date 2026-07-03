'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'

const TYPE_LABELS = { vacancy: 'Вакансии', resume: 'Резюме' }

function filtersToQueryString(
  filters: Record<string, string | number | boolean | undefined>
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

export const MySavedSearchesClient = observer(function MySavedSearchesClient() {
  const { savedSearch: store } = useStores()

  useEffect(() => {
    void store.fetchSavedSearches()
  }, [store])

  const handleRemove = (id: string) => {
    if (!window.confirm('Удалить сохранённый поиск?')) return
    void store.removeSavedSearch(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchSavedSearches(page)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Сохранённые поиски"
        description="Используйте кнопку «Сохранить поиск» на странице вакансий или резюме"
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchSavedSearches()} />
      )}

      {!store.isLoading && store.searches.length === 0 && !store.error && (
        <EmptyState
          icon={Search}
          title="Нет сохранённых поисков"
          description="Используйте кнопку «Сохранить поиск» на странице вакансий или резюме"
        />
      )}

      {/* Desktop table */}
      {store.searches.length > 0 && (
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.searches.map((s) => {
                const basePath = s.type === 'vacancy' ? '/vacancies' : '/resumes'
                const qs = filtersToQueryString(s.filters)
                const href = qs ? `${basePath}?${qs}` : basePath

                return (
                  <TableRow key={s.documentId}>
                    <TableCell className="font-medium">{s.name ?? 'Без названия'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TYPE_LABELS[s.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.createdAt).toLocaleDateString('ru')}
                      {s.lastNotifiedAt && (
                        <span className="block text-xs">
                          уведомление: {new Date(s.lastNotifiedAt).toLocaleDateString('ru')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={href}>Открыть</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(s.documentId)}
                          disabled={store.isLoading}
                        >
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile card list */}
      {store.searches.length > 0 && (
        <div className="space-y-3 md:hidden">
          {store.searches.map((s) => {
            const basePath = s.type === 'vacancy' ? '/vacancies' : '/resumes'
            const qs = filtersToQueryString(s.filters)
            const href = qs ? `${basePath}?${qs}` : basePath

            return (
              <div key={s.documentId} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{TYPE_LABELS[s.type]}</Badge>
                      <p className="truncate font-medium text-card-foreground">
                        {s.name ?? 'Без названия'}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Создан {new Date(s.createdAt).toLocaleDateString('ru')}
                      {s.lastNotifiedAt &&
                        ` · уведомление ${new Date(s.lastNotifiedAt).toLocaleDateString('ru')}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={href}>Открыть</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(s.documentId)}
                      disabled={store.isLoading}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PaginationBar
        page={store.page}
        pageCount={store.pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
