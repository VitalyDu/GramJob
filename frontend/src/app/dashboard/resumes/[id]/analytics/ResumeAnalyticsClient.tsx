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
import { BarChart2 } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  resumeId: string
}

export const ResumeAnalyticsClient = observer(function ResumeAnalyticsClient({ resumeId }: Props) {
  useTelegramBackButton()
  const { analytics: store } = useStores()
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  useEffect(() => {
    void store.fetchResumeAnalytics(resumeId, from, to)
  }, [store, resumeId, from, to])

  const data = store.resumeAnalytics
  const total = data?.total
  const daily = data?.daily ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Аналитика резюме" />

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">С</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">По</label>
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

      {store.isLoading && <CardListSkeleton count={3} />}

      {store.error && !store.isLoading && (
        <ErrorState
          message={store.error}
          onRetry={() => void store.fetchResumeAnalytics(resumeId, from, to)}
        />
      )}

      {total && !store.isLoading && (
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { label: 'Просмотры', value: total.views },
              { label: 'Уник. просмотры', value: total.uniqueViews },
              { label: 'Приглашения', value: total.invitations },
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
            <CardTitle className="text-sm font-semibold">Просмотры по дням</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={daily} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="resumeViewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="invitationsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                  name="Просмотры"
                  stroke="#6366f1"
                  fill="url(#resumeViewsGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="invitations"
                  name="Приглашения"
                  stroke="#f59e0b"
                  fill="url(#invitationsGrad)"
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
            title="Нет данных"
            description="Нет данных за выбранный период"
          />
        )
      )}
    </div>
  )
})
