import type { Core } from '@strapi/strapi'

export const PLAN_LIMITS = {
  free: { vacanciesPerMonth: 3, boostsPerDay: 3 },
  pro: { vacanciesPerMonth: 10, boostsPerDay: 10 },
  max: { vacanciesPerMonth: 50, boostsPerDay: 50 },
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
  vacancyCredits: number
}

export async function checkAndConsumeVacancyCredit(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
  const user = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(userId),
    fields: ['id', 'subscriptionPlan', 'vacancyCredits'],
  })) as unknown as UserWithPlan | null

  if (!user) throw new Error('User not found')

  // 1. Package credits take priority
  if (user.vacancyCredits > 0) {
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { vacancyCredits: user.vacancyCredits - 1 },
    })
    return
  }

  // 2. Check plan monthly limit
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const usedThisMonth = await strapi.documents('api::vacancy.vacancy').count({
    filters: {
      postedBy: { id: { $eq: userId } },
      status: { $notIn: ['draft'] },
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
  const user = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(userId),
    fields: ['id', 'subscriptionPlan'],
  })) as unknown as { subscriptionPlan: string } | null

  if (!user) throw new Error('User not found')

  const limit = getBoostsLimitForPlan(user.subscriptionPlan)
  const used = getBoostsUsedToday(userId)

  if (used >= limit) {
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used, resetAt: `${todayUTC()}T23:59:59Z` },
    })
  }

  incrementBoostCount(userId)
  return limit - used - 1
}
