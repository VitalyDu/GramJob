import type { Core } from '@strapi/strapi'
import { createInvoiceLink } from '../services/telegram-bot'

type UserWithPlan = {
  id: number
  subscriptionPlan: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async subscribe(ctx: any) {
    const user = ctx.state.user as UserWithPlan
    const { planCode } = ctx.request.body as { planCode?: string }

    const validPaidPlans = ['pro', 'max', 'vip']
    if (!planCode || !validPaidPlans.includes(planCode)) {
      return ctx.badRequest('planCode must be one of: pro, max, vip')
    }

    // VIP requires active Max or existing VIP subscription
    if (planCode === 'vip' && user.subscriptionPlan !== 'max' && user.subscriptionPlan !== 'vip') {
      return ctx.forbidden('VIP requires an active Max subscription')
    }

    const plan = await (strapi.documents as any)(
      'api::subscription-plan.subscription-plan'
    ).findFirst({ filters: { code: { $eq: planCode } } })

    if (!plan || !plan.starsPrice) {
      return ctx.notFound('Subscription plan not found')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob ${plan.name}`,
      description: `${plan.name} — подписка на 30 дней`,
      payload: { type: 'subscription', planCode, userId: user.id },
      starsAmount: plan.starsPrice,
    })

    ctx.body = { invoiceUrl }
  },

  async vacancyPack(ctx: any) {
    const user = ctx.state.user as UserWithPlan
    const { packageId } = ctx.request.body as { packageId?: number }

    if (!packageId || typeof packageId !== 'number') {
      return ctx.badRequest('packageId (integer) is required')
    }

    const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
      where: { id: packageId },
    })) as {
      id: number
      name: string
      vacancyCredits: number
      boostCredits: number
      starsPrice: number
    } | null

    if (!pack) {
      return ctx.notFound('Vacancy package not found')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob Vacancy Pack: ${pack.name}`,
      description: `${pack.vacancyCredits} вакансий + ${pack.boostCredits} буст-кредитов`,
      payload: { type: 'vacancy_pack', packageId: pack.id, userId: user.id },
      starsAmount: pack.starsPrice,
    })

    ctx.body = { invoiceUrl }
  },

  async applyPack(ctx: any) {
    const user = ctx.state.user as UserWithPlan
    const { packageId } = ctx.request.body as { packageId?: number }

    if (!packageId || typeof packageId !== 'number') {
      return ctx.badRequest('packageId (integer) is required')
    }

    const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
      where: { id: packageId },
    })) as { id: number; name: string; applyCredits: number; starsPrice: number } | null

    if (!pack) {
      return ctx.notFound('Apply package not found')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob Apply Pack: ${pack.name}`,
      description: `${pack.applyCredits} откликов`,
      payload: { type: 'apply_pack', packageId: pack.id, userId: user.id },
      starsAmount: pack.starsPrice,
    })

    ctx.body = { invoiceUrl }
  },
})
