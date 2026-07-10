'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import type { SubscriptionPlan, User } from '@/types/api'

interface Props {
  user: User
  plan: SubscriptionPlan | null
  resumeTotal: number
}

function getColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-yellow-400'
  return 'bg-green-500'
}

function StatRow({
  label,
  used,
  limit,
  hint,
}: {
  label: string
  used: number
  limit: number
  hint?: string
}) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-card-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full transition-all ${getColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function getTimeUntilMidnightUTC(): string {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const ms = midnight.getTime() - now.getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h === 0) return `${m} мин`
  return `${h} ч ${m} мин`
}

export function PlanUsageCard({ user, plan, resumeTotal }: Props) {
  const { t } = useTranslation()
  const [resetIn, setResetIn] = useState<string | null>(null)

  useEffect(() => {
    setResetIn(getTimeUntilMidnightUTC())
    const id = setInterval(() => setResetIn(getTimeUntilMidnightUTC()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!plan) return null

  const vacanciesUsed = Math.max(0, plan.vacanciesPerMonth - user.vacancyCredits)
  const appliesUsed = Math.max(0, plan.applicationsPerDay - user.applyCredits)

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <StatRow
          label={t('subscription.usage.vacanciesMonth')}
          used={vacanciesUsed}
          limit={plan.vacanciesPerMonth}
        />
        <StatRow
          label={t('subscription.usage.applyToday')}
          used={appliesUsed}
          limit={plan.applicationsPerDay}
          {...(resetIn ? { hint: t('subscription.usage.resetsIn', { time: resetIn }) } : {})}
        />
        <StatRow
          label={t('subscription.usage.resumes')}
          used={resumeTotal}
          limit={plan.resumesLimit}
        />
      </CardContent>
    </Card>
  )
}
