import type { Core } from '@strapi/strapi'

export const APPLY_PLAN_LIMITS = {
  free: { applicationsPerDay: 3 },
  pro: { applicationsPerDay: 10 },
  max: { applicationsPerDay: 50 },
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

type UserWithPlan = {
  subscriptionPlan: string
  applyCredits: number
}

export async function checkAndConsumeApplyCredit(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
  const user = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(userId),
    fields: ['id', 'subscriptionPlan', 'applyCredits'],
  })) as unknown as UserWithPlan | null

  if (!user) throw new Error('User not found')

  // 1. Package credits take priority
  if (user.applyCredits > 0) {
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { applyCredits: user.applyCredits - 1 },
    })
    return
  }

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
}
