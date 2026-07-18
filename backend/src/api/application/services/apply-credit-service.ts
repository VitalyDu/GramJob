import type { Core } from '@strapi/strapi'
import { getPlanLimits, FALLBACK_PLAN_LIMITS } from '../../../services/plan-limits'
import { tryConsumeDaily, refundDaily, getUsedToday } from '../../../services/daily-limits'

/**
 * Обратная совместимость: `APPLY_PLAN_LIMITS` теперь дублирует
 * fallback-значения из plan-limits.ts. Реальный источник — БД (см. getPlanLimits).
 */
export const APPLY_PLAN_LIMITS = {
  free: { applicationsPerDay: FALLBACK_PLAN_LIMITS.free!.applicationsPerDay },
  pro: { applicationsPerDay: FALLBACK_PLAN_LIMITS.pro!.applicationsPerDay },
  max: { applicationsPerDay: FALLBACK_PLAN_LIMITS.max!.applicationsPerDay },
  vip: { applicationsPerDay: FALLBACK_PLAN_LIMITS.vip!.applicationsPerDay },
} as const

type PlanCode = keyof typeof APPLY_PLAN_LIMITS

/** Синхронный fallback-lookup (для тестов и legacy). Runtime использует БД. */
export function getApplyLimitForPlan(plan: string): number {
  return (
    APPLY_PLAN_LIMITS[plan as PlanCode]?.applicationsPerDay ??
    APPLY_PLAN_LIMITS.free.applicationsPerDay
  )
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** DB-backed: сколько откликов пользователь уже потратил сегодня. */
export async function getAppliesUsedToday(strapi: Core.Strapi, userId: number): Promise<number> {
  return getUsedToday(strapi, 'apply', userId)
}

type UserWithPlan = {
  subscriptionPlan: string
}

export type ConsumedApplySource = 'credit' | 'plan'

/** Refund a consumed apply credit when the application could not be created. */
export async function refundApplyCredit(
  strapi: Core.Strapi,
  userId: number,
  source: ConsumedApplySource
): Promise<void> {
  if (source === 'credit') {
    await strapi.db.connection.raw(
      `UPDATE up_users SET apply_credits = COALESCE(apply_credits, 0) + 1 WHERE id = ?`,
      [userId]
    )
  } else {
    await refundDaily(strapi, 'apply', userId)
  }
}

export async function checkAndConsumeApplyCredit(
  strapi: Core.Strapi,
  userId: number
): Promise<ConsumedApplySource> {
  const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['id', 'subscriptionPlan'],
  })) as UserWithPlan | null

  if (!user) throw new Error('User not found')

  // 1. Package credits take priority — atomic decrement guarded by the WHERE
  // condition so concurrent applies cannot spend the same credit twice
  const consumed = (await strapi.db.connection.raw(
    `UPDATE up_users SET apply_credits = apply_credits - 1 WHERE id = ? AND apply_credits > 0`,
    [userId]
  )) as { rowCount?: number }
  if ((consumed.rowCount ?? 0) > 0) return 'credit'

  // 2. Check plan daily limit — атомарный INC when under limit, null when reached
  const planLimits = await getPlanLimits(strapi, user.subscriptionPlan)
  const limit = planLimits.applicationsPerDay

  const newCount = await tryConsumeDaily(strapi, 'apply', userId, limit)
  if (newCount === null) {
    const used = await getUsedToday(strapi, 'apply', userId)
    const resetAt = `${todayUTC()}T23:59:59Z`
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used, resetAt },
    })
  }
  return 'plan'
}
