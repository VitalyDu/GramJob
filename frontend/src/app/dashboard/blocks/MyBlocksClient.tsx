'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'

const TARGET_TYPE_LABELS = { employer: 'Работодатель', candidate: 'Кандидат' }

export const MyBlocksClient = observer(function MyBlocksClient() {
  const { block: store } = useStores()

  useEffect(() => {
    void store.fetchBlocks()
  }, [store])

  const handleUnblock = (id: string) => {
    if (!window.confirm('Разблокировать этого пользователя?')) return
    void store.removeBlock(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchBlocks(page)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Заблокированные пользователи</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Контент заблокированных пользователей не отображается в результатах поиска.
        </p>
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.blocks.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Нет заблокированных пользователей.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.blocks.map((b) => (
          <div
            key={b.documentId}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-medium text-card-foreground">
                {TARGET_TYPE_LABELS[b.targetType]} #{b.targetId}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Заблокирован {new Date(b.createdAt).toLocaleDateString('ru')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnblock(b.documentId)}
              disabled={store.isLoading}
            >
              Разблокировать
            </Button>
          </div>
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
