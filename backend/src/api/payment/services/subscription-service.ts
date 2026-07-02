import type { Core } from '@strapi/strapi'

export type PlanCode = 'free' | 'pro' | 'max' | 'vip'
export type CreditType = 'vacancy' | 'apply' | 'boost'

export const CREDIT_FIELD_MAP: Record<
  CreditType,
  'vacancyCredits' | 'applyCredits' | 'boostCredits'
> = {
  vacancy: 'vacancyCredits',
  apply: 'applyCredits',
  boost: 'boostCredits',
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

export function resolveSubscriptionStart(
  planCode: PlanCode,
  currentPlan: string | null | undefined,
  currentExpiresAt: string | null | undefined,
  now: Date = new Date()
): Date {
  // Renewal of the same plan extends the remaining period instead of resetting it
  if (currentPlan === planCode && currentExpiresAt) {
    const currentExpiry = new Date(currentExpiresAt)
    if (currentExpiry > now) return currentExpiry
  }
  return now
}

export async function activateSubscription(
  strapi: Core.Strapi,
  userId: number,
  planCode: PlanCode
): Promise<void> {
  const plan = (await strapi.db.query('api::subscription-plan.subscription-plan').findOne({
    where: { code: planCode },
    select: ['durationDays'],
  })) as { durationDays: number } | null

  const currentUser = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['subscriptionPlan', 'subscriptionExpiresAt'],
  })) as { subscriptionPlan: string; subscriptionExpiresAt: string | null } | null

  const from = resolveSubscriptionStart(
    planCode,
    currentUser?.subscriptionPlan,
    currentUser?.subscriptionExpiresAt
  )

  const expiresAt = calculateExpiresAt(plan?.durationDays ?? 30, from)
  const updateData = buildUserUpdateData(planCode, expiresAt)

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: updateData,
  })

  strapi.log.info(
    `[subscription] User ${userId} activated plan=${planCode}, expiresAt=${expiresAt}`
  )
}

const CREDIT_COLUMN_MAP: Record<CreditType, string> = {
  vacancy: 'vacancy_credits',
  apply: 'apply_credits',
  boost: 'boost_credits',
}

export async function addCredits(
  strapi: Core.Strapi,
  userId: number,
  type: CreditType,
  amount: number
): Promise<void> {
  const column = CREDIT_COLUMN_MAP[type]

  // Atomic increment: concurrent webhooks must not lose credits (read-then-write race)
  const result = (await strapi.db.connection.raw(
    `UPDATE up_users SET ${column} = COALESCE(${column}, 0) + ? WHERE id = ?`,
    [amount, userId]
  )) as { rowCount?: number }

  if ((result.rowCount ?? 0) === 0) throw new Error(`User ${userId} not found`)

  strapi.log.info(`[subscription] User ${userId} +${amount} ${CREDIT_FIELD_MAP[type]}`)
}

export async function expireSubscription(strapi: Core.Strapi, userId: number): Promise<void> {
  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: { subscriptionPlan: 'free', subscriptionExpiresAt: null, isVip: false },
  })

  strapi.log.info(`[subscription] User ${userId} subscription expired, reverted to free`)
}
