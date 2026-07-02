'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'

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
      <h1 className="text-2xl font-bold">Сохранённые поиски</h1>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.searches.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Нет сохранённых поисков.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Используйте кнопку «Сохранить поиск» на странице вакансий или резюме.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {store.searches.map((s) => {
          const basePath = s.type === 'vacancy' ? '/vacancies' : '/resumes'
          const qs = filtersToQueryString(s.filters)
          const href = qs ? `${basePath}?${qs}` : basePath

          return (
            <div key={s.documentId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {TYPE_LABELS[s.type]}
                    </span>
                    <p className="truncate font-medium text-card-foreground">
                      {s.name ?? 'Без названия'}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Создан {new Date(s.createdAt).toLocaleDateString('ru')}
                    {s.lastNotifiedAt &&
                      ` · последнее уведомление ${new Date(s.lastNotifiedAt).toLocaleDateString('ru')}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={href}
                    className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Открыть
                  </Link>
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
