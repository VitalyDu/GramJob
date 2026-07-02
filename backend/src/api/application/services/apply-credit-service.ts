import type { Core } from '@strapi/strapi'

export const APPLY_PLAN_LIMITS = {
  free: { applicationsPerDay: 3 },
  pro: { applicationsPerDay: 10 },
  max: { applicationsPerDay: 50 },
  vip: { applicationsPerDay: 50 },
} as const

type PlanCode = keyof typeof APPLY_PLAN_LIMITS

export function getApplyLimitForPlan(plan: string): number {
  return (
    APPLY_PLAN_LIMITS[plan as PlanCode]?.applicationsPerDay ??
    APPLY_PLAN_LIMITS.free.applicationsPerDay
  )
}

// In-memory daily apply tracker (resets on restart — sufficient for MVP, replaced in Sprint 6)
const dailyApplies = new Map<number, { count: number; date: string }>()

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getAppliesUsedToday(userId: number): number {
  const entry = dailyApplies.get(userId)
  if (!entry || entry.date !== todayUTC()) return 0
  return entry.count
}

export function incrementApplyCount(userId: number): void {
  const today = todayUTC()
  const entry = dailyApplies.get(userId)
  if (!entry || entry.date !== today) {
    dailyApplies.set(userId, { count: 1, date: today })
  } else {
    entry.count++
  }
}

export function decrementApplyCount(userId: number): void {
  const entry = dailyApplies.get(userId)
  if (entry && entry.date === todayUTC() && entry.count > 0) {
    entry.count--
  }
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
    decrementApplyCount(userId)
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

  // 2. Check plan daily limit
  const limit = getApplyLimitForPlan(user.subscriptionPlan)
  const used = getAppliesUsedToday(userId)

  if (used >= limit) {
    const resetAt = `${todayUTC()}T23:59:59Z`
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used, resetAt },
    })
  }

  incrementApplyCount(userId)
  return 'plan'
}
