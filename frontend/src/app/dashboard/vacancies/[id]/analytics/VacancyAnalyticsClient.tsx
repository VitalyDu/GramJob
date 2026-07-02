'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
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
import { useStores } from '@/stores/StoreProvider'

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
  const { analytics: store } = useStores()
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  useEffect(() => {
    void store.fetchVacancyAnalytics(vacancyId, from, to)
  }, [store, vacancyId, from, to])

  const data = store.vacancyAnalytics
  const total = data?.total
  const daily = data?.daily ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vacancies"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Аналитика вакансии</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">С</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">По</label>
          <input
            type="date"
            value={to}
            min={from}
            max={defaultTo()}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {total && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              { label: 'Просмотры', value: total.views },
              { label: 'Уник. просмотры', value: total.uniqueViews },
              { label: 'Отклики', value: total.applications },
              { label: 'CTR', value: `${total.ctr}%` },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-card-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {daily.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-4 text-sm font-semibold text-foreground">Просмотры по дням</p>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                fill="url(#viewsGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="applications"
                name="Отклики"
                stroke="#10b981"
                fill="url(#appsGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        !store.isLoading &&
        !store.error && (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">Нет данных за выбранный период.</p>
          </div>
        )
      )}
    </div>
  )
})
