import type { Core } from '@strapi/strapi'

export const PLAN_LIMITS = {
  free: { vacanciesPerMonth: 3, boostsPerDay: 3 },
  pro: { vacanciesPerMonth: 10, boostsPerDay: 10 },
  max: { vacanciesPerMonth: 50, boostsPerDay: 50 },
  vip: { vacanciesPerMonth: 50, boostsPerDay: 50 },
} as const

type PlanCode = keyof typeof PLAN_LIMITS

export function getLimitForPlan(plan: string): number {
  return PLAN_LIMITS[plan as PlanCode]?.vacanciesPerMonth ?? PLAN_LIMITS.free.vacanciesPerMonth
}

export function getBoostsLimitForPlan(plan: string): number {
  return PLAN_LIMITS[plan as PlanCode]?.boostsPerDay ?? PLAN_LIMITS.free.boostsPerDay
}

// In-memory daily boost tracker (resets on restart — sufficient for MVP, replaced in Sprint 6)
const dailyBoosts = new Map<number, { count: number; date: string }>()

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getBoostsUsedToday(userId: number): number {
  const entry = dailyBoosts.get(userId)
  if (!entry || entry.date !== todayUTC()) return 0
  return entry.count
}

export function incrementBoostCount(userId: number): void {
  const today = todayUTC()
  const entry = dailyBoosts.get(userId)
  if (!entry || entry.date !== today) {
    dailyBoosts.set(userId, { count: 1, date: today })
  } else {
    entry.count++
  }
}

type UserWithPlan = {
  subscriptionPlan: string
}

export async function checkAndConsumeVacancyCredit(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
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
  if ((consumed.rowCount ?? 0) > 0) return

  // 2. Check plan monthly limit
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const usedThisMonth = await strapi.documents('api::vacancy.vacancy').count({
    filters: {
      postedBy: { id: { $eq: userId } },
      status: { $in: ['moderation', 'published'] },
      createdAt: { $gte: monthStart.toISOString() },
    },
  })

  const limit = getLimitForPlan(user.subscriptionPlan)

  if (usedThisMonth >= limit) {
    const resetAt = new Date()
    resetAt.setUTCMonth(resetAt.getUTCMonth() + 1, 1)
    resetAt.setUTCHours(0, 0, 0, 0)

    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used: usedThisMonth, resetAt: resetAt.toISOString() },
    })
  }
}

export async function checkAndConsumeBoost(strapi: Core.Strapi, userId: number): Promise<number> {
  const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['id', 'subscriptionPlan'],
  })) as { subscriptionPlan: string } | null

  if (!user) throw new Error('User not found')

  const limit = getBoostsLimitForPlan(user.subscriptionPlan)
  const used = getBoostsUsedToday(userId)

  // 1. Package boost credits take priority over the daily plan limit (atomic decrement)
  const consumed = (await strapi.db.connection.raw(
    `UPDATE up_users SET boost_credits = boost_credits - 1 WHERE id = ? AND boost_credits > 0`,
    [userId]
  )) as { rowCount?: number }
  if ((consumed.rowCount ?? 0) > 0) return Math.max(limit - used, 0)

  // 2. Daily plan limit
  if (used >= limit) {
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used, resetAt: `${todayUTC()}T23:59:59Z` },
    })
  }

  incrementBoostCount(userId)
  return limit - used - 1
}
