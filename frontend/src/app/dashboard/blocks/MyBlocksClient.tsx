'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { ShieldOff } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
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

const TARGET_TYPE_LABELS = { employer: 'Работодатель', candidate: 'Кандидат' }

export const MyBlocksClient = observer(function MyBlocksClient() {
  const { block: store } = useStores()
  const isAuthenticated = useRequireAuth()

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

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заблокированные"
        description="Контент заблокированных пользователей не отображается в результатах поиска"
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchBlocks()} />
      )}

      {!store.isLoading && store.blocks.length === 0 && !store.error && (
        <EmptyState
          icon={ShieldOff}
          title="Нет заблокированных пользователей"
          description="Заблокированные пользователи не будут показывать вам свой контент"
        />
      )}

      {/* Desktop table */}
      {store.blocks.length > 0 && (
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Дата блокировки</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.blocks.map((b) => (
                <TableRow key={b.documentId}>
                  <TableCell className="font-medium">
                    {TARGET_TYPE_LABELS[b.targetType]} #{b.targetId}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString('ru')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(b.documentId)}
                      disabled={store.isLoading}
                    >
                      Разблокировать
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile card list */}
      {store.blocks.length > 0 && (
        <div className="space-y-3 md:hidden">
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
      )}

      <PaginationBar
        page={store.page}
        pageCount={store.pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
