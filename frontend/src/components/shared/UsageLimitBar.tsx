'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  label: string
  used: number
  limit: number
  resetsAt?: string
}

// used/limit fill: 0–50 % жёлтый, 50–80 % оранжевый, 80–100 % красный
export function getUsageColorClass(used: number, limit: number): string {
  if (limit <= 0) return 'bg-yellow-400'
  const pct = used / limit
  if (pct >= 0.8) return 'bg-red-500'
  if (pct >= 0.5) return 'bg-orange-500'
  return 'bg-yellow-400'
}

function formatTimeUntil(isoDate: string, lang: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return ''
  const totalMinutes = Math.floor(diff / 60_000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (lang === 'en') {
    if (h === 0) return `${m}m`
    const d = Math.floor(h / 24)
    const rh = h % 24
    if (d > 0) return rh > 0 ? `${d}d ${rh}h` : `${d}d`
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(h / 24)
  const rh = h % 24
  if (d > 0) return rh > 0 ? `${d} д ${rh} ч` : `${d} д`
  if (h === 0) return `${m} мин`
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`
}

export function UsageLimitBar({ label, used, limit, resetsAt }: Props) {
  const { t, i18n } = useTranslation()
  const [timeUntil, setTimeUntil] = useState<string | null>(null)

  useEffect(() => {
    if (!resetsAt) return
    const update = () => {
      const s = formatTimeUntil(resetsAt, i18n.language)
      setTimeUntil(s || null)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [resetsAt, i18n.language])

  const pct = limit > 0 ? Math.min(used / limit, 1) * 100 : 0
  const colorClass = getUsageColorClass(used, limit)

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
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {resetsAt && timeUntil && (
        <p className="text-xs text-muted-foreground">{t('limits.resetsIn', { time: timeUntil })}</p>
      )}
    </div>
  )
}
