'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { ShieldOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dateLocale } from '@/lib/date-utils'
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

export const MyBlocksClient = observer(function MyBlocksClient() {
  const { t, i18n } = useTranslation()
  const { block: store } = useStores()
  const isAuthenticated = useRequireAuth()

  useEffect(() => {
    void store.fetchBlocks()
  }, [store])

  const handleUnblock = (id: string) => {
    if (!window.confirm(t('dashboard.blocks.confirmUnblock'))) return
    void store.removeBlock(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchBlocks(page)
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.blocks.title')}
        description={t('dashboard.blocks.description')}
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchBlocks()} />
      )}

      {!store.isLoading && store.blocks.length === 0 && !store.error && (
        <EmptyState
          icon={ShieldOff}
          title={t('dashboard.blocks.empty')}
          description={t('dashboard.blocks.emptyDesc')}
        />
      )}

      {/* Desktop table */}
      {store.blocks.length > 0 && (
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard.blocks.colUser')}</TableHead>
                <TableHead>{t('dashboard.blocks.colDate')}</TableHead>
                <TableHead className="text-right">{t('dashboard.blocks.colAction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.blocks.map((b) => (
                <TableRow key={b.documentId}>
                  <TableCell className="font-medium">
                    <span className="text-xs text-muted-foreground mr-2">
                      {t(`dashboard.blocks.targetTypes.${b.targetType}`)}
                    </span>
                    {b.targetName || `#${b.targetId}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString(dateLocale(i18n.language))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(b.documentId)}
                      disabled={store.isLoading}
                    >
                      {t('dashboard.blocks.unblock')}
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
                  {b.targetName || `#${b.targetId}`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`dashboard.blocks.targetTypes.${b.targetType}`)} &middot;{' '}
                  {t('dashboard.blocks.blockedAt')}{' '}
                  {new Date(b.createdAt).toLocaleDateString(dateLocale(i18n.language))}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnblock(b.documentId)}
                disabled={store.isLoading}
              >
                {t('dashboard.blocks.unblock')}
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
