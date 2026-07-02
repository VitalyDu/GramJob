'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { ApplicationCard } from '@/components/application/ApplicationCard'
import { Button } from '@/components/ui/button'

export const MyApplicationsClient = observer(function MyApplicationsClient() {
  const { application: store } = useStores()

  useEffect(() => {
    void store.fetchMyApplications()
  }, [store])

  const handlePageChange = (page: number) => {
    void store.fetchMyApplications(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои отклики</h1>
        {store.total > 0 && <p className="text-sm text-muted-foreground">{store.total} откликов</p>}
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.applications.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Вы ещё не откликались на вакансии.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.applications.map((app) => (
          <ApplicationCard key={app.documentId} application={app} employerMode={false} />
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
