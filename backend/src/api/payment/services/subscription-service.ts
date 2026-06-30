import type { Core } from '@strapi/strapi'

export type PlanCode = 'free' | 'pro' | 'max' | 'vip'
export type CreditType = 'vacancy' | 'apply'

export const CREDIT_FIELD_MAP: Record<CreditType, 'vacancyCredits' | 'applyCredits'> = {
  vacancy: 'vacancyCredits',
  apply: 'applyCredits',
}

export function calculateExpiresAt(durationDays: number, from: Date = new Date()): string {
  const result = new Date(from)
  result.setUTCDate(result.getUTCDate() + durationDays)
  return result.toISOString()
}

export function buildUserUpdateData(
  planCode: PlanCode,
  expiresAt: string
): {
  subscriptionPlan: PlanCode
  subscriptionExpiresAt: string
  isVip: boolean
} {
  return {
    subscriptionPlan: planCode,
    subscriptionExpiresAt: expiresAt,
    isVip: planCode === 'vip',
  }
}

export async function activateSubscription(
  strapi: Core.Strapi,
  userId: number,
  planCode: PlanCode
): Promise<void> {
  const expiresAt = calculateExpiresAt(30)
  const updateData = buildUserUpdateData(planCode, expiresAt)

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: updateData,
  })

  strapi.log.info(
    `[subscription] User ${userId} activated plan=${planCode}, expiresAt=${expiresAt}`
  )
}

export async function addCredits(
  strapi: Core.Strapi,
  userId: number,
  type: CreditType,
  amount: number
): Promise<void> {
  const field = CREDIT_FIELD_MAP[type]

  const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: [field],
  })) as Record<string, number> | null

  if (!user) throw new Error(`User ${userId} not found`)

  const current = user[field] ?? 0

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: { [field]: current + amount },
  })

  strapi.log.info(`[subscription] User ${userId} +${amount} ${field} (total: ${current + amount})`)
}

export async function expireSubscription(strapi: Core.Strapi, userId: number): Promise<void> {
  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: { subscriptionPlan: 'free', subscriptionExpiresAt: null, isVip: false },
  })

  strapi.log.info(`[subscription] User ${userId} subscription expired, reverted to free`)
}
