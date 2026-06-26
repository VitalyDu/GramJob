import type { Core } from '@strapi/strapi'

type UserWithPlan = { subscriptionPlan: string }

export function checkIsMaxPlan(user: UserWithPlan): boolean {
  return user.subscriptionPlan === 'max' || user.subscriptionPlan === 'vip'
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const fullUser = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(user.id),
    fields: ['id', 'subscriptionPlan'],
  })) as unknown as UserWithPlan | null

  if (!fullUser) return false

  if (!checkIsMaxPlan(fullUser)) {
    ctx.status = 403
    ctx.body = {
      error: {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Max subscription plan required to access resume database',
      },
    }
    return false
  }

  return true
}
