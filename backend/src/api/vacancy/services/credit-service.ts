import type { Core } from '@strapi/strapi'
import { getPlanLimits, FALLBACK_PLAN_LIMITS, type PlanLimits } from '../../../services/plan-limits'
import { tryConsumeDaily, refundDaily, getUsedToday } from '../../../services/daily-limits'

/**
 * Обратная совместимость: `PLAN_LIMITS` продолжает существовать в форме
 * `{vacanciesPerMonth, boostsPerDay}` для тестов и legacy-импортёров, но
 * реальный источник значений — БД (см. plan-limits.ts).
 */
export const PLAN_LIMITS = {
  free: {
    vacanciesPerMonth: FALLBACK_PLAN_LIMITS.free!.vacanciesPerMonth,
    boostsPerDay: FALLBACK_PLAN_LIMITS.free!.vacancyBoostsPerDay,
  },
  pro: {
    vacanciesPerMonth: FALLBACK_PLAN_LIMITS.pro!.vacanciesPerMonth,
    boostsPerDay: FALLBACK_PLAN_LIMITS.pro!.vacancyBoostsPerDay,
  },
  max: {
    vacanciesPerMonth: FALLBACK_PLAN_LIMITS.max!.vacanciesPerMonth,
    boostsPerDay: FALLBACK_PLAN_LIMITS.max!.vacancyBoostsPerDay,
  },
  vip: {
    vacanciesPerMonth: FALLBACK_PLAN_LIMITS.vip!.vacanciesPerMonth,
    boostsPerDay: FALLBACK_PLAN_LIMITS.vip!.vacancyBoostsPerDay,
  },
} as const

/**
 * Синхронный fallback-только lookup для мест, где нет доступа к strapi
 * (например, старых юнит-тестов). Реальный вызов из runtime использует
 * `getVacancyLimitAsync` / `getBoostsLimitAsync`.
 */
export function getLimitForPlan(plan: string): number {
  return (
    PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.vacanciesPerMonth ??
    PLAN_LIMITS.free.vacanciesPerMonth
  )
}

export function getBoostsLimitForPlan(plan: string): number {
  return (
    PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.boostsPerDay ?? PLAN_LIMITS.free.boostsPerDay
  )
}

async function loadLimits(strapi: Core.Strapi, plan: string): Promise<PlanLimits> {
  return getPlanLimits(strapi, plan)
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** DB-backed replacement — сохранён для обратной совместимости API. */
export async function getBoostsUsedToday(strapi: Core.Strapi, userId: number): Promise<number> {
  return getUsedToday(strapi, 'boost', userId)
}

type UserWithPlan = {
  subscriptionPlan: string
}

export type ConsumeVacancyCreditResult = { source: 'plan' | 'package' }

export async function checkAndConsumeVacancyCredit(
  strapi: Core.Strapi,
  userId: number
): Promise<ConsumeVacancyCreditResult> {
  const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['id', 'subscriptionPlan'],
  })) as UserWithPlan | null

  if (!user) throw new Error('User not found')

  // 1. Package credits take priority — atomic decrement guarded by the WHERE
  // condition so concurrent publishes cannot spend the same credit twice
  const consumed = (await strapi.db.connection.raw(
    `UPDATE up_users SET vacancy_credits = vacancy_credits - 1 WHERE id = ? AND vacancy_credits > 0`,
    [userId]
  )) as { rowCount?: number }
  if ((consumed.rowCount ?? 0) > 0) return { source: 'package' }

  // 2. Check active vacancies limit (moderation + published, any age).
  // Не фильтруем по createdAt: вакансии из прошлых месяцев, отправленные повторно,
  // должны считаться против лимита активных — иначе старые rejected/expired вакансии
  // позволяют обходить ограничение (M1), а сам лимит activeVacanciesLimit никогда
  // не применяется (H1).
  const activeCount = await strapi.documents('api::vacancy.vacancy').count({
    filters: {
      postedBy: { id: { $eq: userId } },
      moderationStatus: { $in: ['moderation', 'published'] },
    },
  })

  const planLimits = await loadLimits(strapi, user.subscriptionPlan)
  const limit = planLimits.activeVacanciesLimit

  if (activeCount >= limit) {
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used: activeCount },
    })
  }

  return { source: 'plan' }
}

export async function refundVacancyCredit(strapi: Core.Strapi, userId: number): Promise<void> {
  await strapi.db.connection.raw(
    `UPDATE up_users SET vacancy_credits = vacancy_credits + 1 WHERE id = ?`,
    [userId]
  )
}

export type BoostConsumeResult = {
  boostsRemaining: number
  source: 'plan' | 'package'
}

export async function checkAndConsumeBoost(
  strapi: Core.Strapi,
  userId: number
): Promise<BoostConsumeResult> {
  const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['id', 'subscriptionPlan'],
  })) as { subscriptionPlan: string } | null

  if (!user) throw new Error('User not found')

  const planLimits = await loadLimits(strapi, user.subscriptionPlan)
  const limit = planLimits.vacancyBoostsPerDay

  // 1. Package boost credits take priority over the daily plan limit (atomic decrement).
  // RETURNING boost_credits даёт точный остаток пакета без лишнего SELECT.
  const consumed = (await strapi.db.connection.raw(
    `UPDATE up_users SET boost_credits = boost_credits - 1 WHERE id = ? AND boost_credits > 0 RETURNING boost_credits`,
    [userId]
  )) as { rowCount?: number; rows?: Array<{ boost_credits: number }> }
  if ((consumed.rowCount ?? 0) > 0) {
    const remaining = consumed.rows?.[0]?.boost_credits ?? 0
    return { boostsRemaining: remaining, source: 'package' }
  }

  // 2. Daily plan limit — атомарный INC при still-under-limit
  const newCount = await tryConsumeDaily(strapi, 'boost', userId, limit)
  if (newCount === null) {
    const used = await getUsedToday(strapi, 'boost', userId)
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used, resetAt: `${todayUTC()}T23:59:59Z` },
    })
  }
  return { boostsRemaining: Math.max(limit - newCount, 0), source: 'plan' }
}

export async function refundBoost(
  strapi: Core.Strapi,
  userId: number,
  source: 'plan' | 'package'
): Promise<void> {
  if (source === 'package') {
    await strapi.db.connection.raw(
      `UPDATE up_users SET boost_credits = COALESCE(boost_credits, 0) + 1 WHERE id = ?`,
      [userId]
    )
  } else {
    await refundDaily(strapi, 'boost', userId)
  }
}
