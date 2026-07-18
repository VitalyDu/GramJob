import type { Core } from '@strapi/strapi'
import { sendNotification } from './notification.service'

// Не спамить одного и того же пользователя одинаковыми limits_reached чаще раза в сутки.
// В памяти — как остальные daily-трекеры; сбрасывается на рестарте (MVP).
const notifiedToday = new Map<string, string>()

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export type LimitType = 'daily_applications' | 'monthly_vacancies' | 'daily_boosts' | 'resumes'

const LIMIT_LABELS: Record<LimitType, string> = {
  daily_applications: 'откликов в сутки',
  monthly_vacancies: 'вакансий в месяц',
  daily_boosts: 'поднятий в сутки',
  resumes: 'резюме',
}

export function notifyLimitReached(
  strapi: Core.Strapi,
  userId: number,
  limitType: LimitType
): void {
  const today = todayUTC()
  const key = `${userId}:${limitType}`
  if (notifiedToday.get(key) === today) return
  notifiedToday.set(key, today)

  // Fire-and-forget: клиент уже получил ошибку 403; уведомление — best-effort апсейл.
  void sendNotification(strapi, {
    userId,
    type: 'limits_reached',
    templateData: { limitType: LIMIT_LABELS[limitType] },
  })
}
