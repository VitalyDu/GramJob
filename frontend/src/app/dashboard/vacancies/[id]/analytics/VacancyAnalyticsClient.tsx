'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { BarChart2 } from 'lucide-react'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  vacancyId: string
}

export const VacancyAnalyticsClient = observer(function VacancyAnalyticsClient({
  vacancyId,
}: Props) {
  const { t } = useTranslation()
  const { analytics: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  useEffect(() => {
    void store.fetchVacancyAnalytics(vacancyId, from, to)
  }, [store, vacancyId, from, to])

  const data = store.vacancyAnalytics
  const total = data?.total
  const daily = data?.daily ?? []

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.analytics.vacancyTitle')} />

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t('dashboard.analytics.from')}
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t('dashboard.analytics.to')}
          </label>
          <input
            type="date"
            value={to}
            min={from}
            max={defaultTo()}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {store.isLoading && <CardListSkeleton count={4} />}

      {store.error && !store.isLoading && (
        <ErrorState
          message={store.error}
          onRetry={() => void store.fetchVacancyAnalytics(vacancyId, from, to)}
        />
      )}

      {total && !store.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              { label: t('dashboard.analytics.stats.views'), value: total.views },
              { label: t('dashboard.analytics.stats.uniqueViews'), value: total.uniqueViews },
              { label: t('dashboard.analytics.stats.applications'), value: total.applications },
              { label: t('dashboard.analytics.stats.ctr'), value: `${total.ctr}%` },
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

      {daily.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t('dashboard.analytics.chartTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={daily} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                  }
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) =>
                    new Date(String(v)).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="views"
                  name={t('dashboard.analytics.series.views')}
                  stroke="#6366f1"
                  fill="url(#viewsGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  name={t('dashboard.analytics.series.applications')}
                  stroke="#10b981"
                  fill="url(#appsGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        !store.isLoading &&
        !store.error && (
          <EmptyState
            icon={BarChart2}
            title={t('dashboard.analytics.noData')}
            description={t('dashboard.analytics.noDataDesc')}
          />
        )
      )}
    </div>
  )
})
