'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
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
import { filtersToQueryString } from '@/lib/saved-search-utils'

export const MySavedSearchesClient = observer(function MySavedSearchesClient() {
  const { t } = useTranslation()
  const { savedSearch: store } = useStores()
  const isAuthenticated = useRequireAuth()

  useEffect(() => {
    void store.fetchSavedSearches()
  }, [store])

  const handleRemove = (id: string) => {
    if (!window.confirm(t('dashboard.savedSearches.confirmRemove'))) return
    void store.removeSavedSearch(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchSavedSearches(page)
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.savedSearches.title')}
        description={t('dashboard.savedSearches.description')}
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchSavedSearches()} />
      )}

      {!store.isLoading && store.searches.length === 0 && !store.error && (
        <EmptyState
          icon={Search}
          title={t('dashboard.savedSearches.empty')}
          description={t('dashboard.savedSearches.emptyDesc')}
        />
      )}

      {/* Desktop table */}
      {store.searches.length > 0 && (
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard.savedSearches.colName')}</TableHead>
                <TableHead>{t('dashboard.savedSearches.colType')}</TableHead>
                <TableHead>{t('dashboard.savedSearches.colDate')}</TableHead>
                <TableHead className="text-right">
                  {t('dashboard.savedSearches.colActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.searches.map((s) => {
                const basePath = s.type === 'vacancy' ? '/vacancies' : '/resumes'
                const qs = filtersToQueryString(s.filters)
                const href = qs ? `${basePath}?${qs}` : basePath

                return (
                  <TableRow key={s.documentId}>
                    <TableCell className="font-medium">
                      {s.name ?? t('dashboard.savedSearches.unnamed')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t(`dashboard.savedSearches.types.${s.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.createdAt).toLocaleDateString('ru')}
                      {s.lastNotifiedAt && (
                        <span className="block text-xs">
                          {t('dashboard.savedSearches.lastNotified')}:{' '}
                          {new Date(s.lastNotifiedAt).toLocaleDateString('ru')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={href}>{t('dashboard.savedSearches.open')}</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(s.documentId)}
                          disabled={store.isLoading}
                        >
                          {t('dashboard.savedSearches.remove')}
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
                      <Badge variant="secondary">
                        {t(`dashboard.savedSearches.types.${s.type}`)}
                      </Badge>
                      <p className="truncate font-medium text-card-foreground">
                        {s.name ?? t('dashboard.savedSearches.unnamed')}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('dashboard.savedSearches.createdAt')}{' '}
                      {new Date(s.createdAt).toLocaleDateString('ru')}
                      {s.lastNotifiedAt &&
                        ` · ${t('dashboard.savedSearches.lastNotified')} ${new Date(s.lastNotifiedAt).toLocaleDateString('ru')}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={href}>{t('dashboard.savedSearches.open')}</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(s.documentId)}
                      disabled={store.isLoading}
                    >
                      {t('dashboard.savedSearches.remove')}
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
