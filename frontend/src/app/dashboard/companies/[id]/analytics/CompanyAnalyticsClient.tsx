'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'

interface Props {
  companyId: string
}

export const CompanyAnalyticsClient = observer(function CompanyAnalyticsClient({
  companyId,
}: Props) {
  const { t } = useTranslation()
  const { analytics: store } = useStores()
  const isAuthenticated = useRequireAuth()

  useEffect(() => {
    void store.fetchCompanyAnalytics(companyId)
  }, [store, companyId])

  const total = store.companyAnalytics?.total

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.analytics.companyTitle')} />

      {store.isLoading && <CardListSkeleton count={2} />}

      {store.error && !store.isLoading && (
        <ErrorState
          message={store.error}
          onRetry={() => void store.fetchCompanyAnalytics(companyId)}
        />
      )}

      {total && !store.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              { label: t('dashboard.analytics.stats.views'), value: total.views },
              { label: t('dashboard.analytics.stats.uniqueViews'), value: total.uniqueViews },
              {
                label: t('dashboard.analytics.stats.publishedVacancies'),
                value: total.vacanciesCount,
              },
              {
                label: t('dashboard.analytics.stats.applications'),
                value: total.applicationsCount,
              },
            ] as const
          ).map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-card-foreground">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
})
