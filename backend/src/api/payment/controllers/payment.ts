import type { Core } from '@strapi/strapi'
import {
  createInvoiceLink,
  URGENT_PRICE_STARS,
  TOP_PLACEMENT_PRICE_STARS,
} from '../services/telegram-bot'

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

  async urgent(ctx: any) {
    const user = ctx.state.user as UserWithPlan
    const { vacancyId } = ctx.request.body as { vacancyId?: string }

    if (!vacancyId || typeof vacancyId !== 'string') {
      return ctx.badRequest('vacancyId (string) is required')
    }

    const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
      documentId: vacancyId,
      fields: ['documentId', 'title', 'moderationStatus', 'urgent'],
      populate: { postedBy: { fields: ['id'] } },
    })
    if (!vacancy) return ctx.notFound('Vacancy not found')
    if ((vacancy as any).postedBy?.id !== user.id) {
      return ctx.forbidden('You do not own this vacancy')
    }
    if ((vacancy as any).moderationStatus !== 'published') {
      return ctx.badRequest('Vacancy must be published')
    }
    if ((vacancy as any).urgent) {
      return ctx.badRequest('Vacancy is already marked as urgent')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob Urgent: ${(vacancy as any).title}`,
      description: 'Пометить вакансию как срочную (🔥 Urgent)',
      payload: { type: 'urgent', vacancyDocumentId: vacancyId, userId: user.id },
      starsAmount: URGENT_PRICE_STARS,
    })

    ctx.body = { invoiceUrl }
  },

  async topPlacement(ctx: any) {
    const user = ctx.state.user as UserWithPlan
    const { vacancyId } = ctx.request.body as { vacancyId?: string }

    if (!vacancyId || typeof vacancyId !== 'string') {
      return ctx.badRequest('vacancyId (string) is required')
    }

    const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
      documentId: vacancyId,
      fields: ['documentId', 'title', 'moderationStatus', 'topPlacement'],
      populate: { postedBy: { fields: ['id'] } },
    })
    if (!vacancy) return ctx.notFound('Vacancy not found')
    if ((vacancy as any).postedBy?.id !== user.id) {
      return ctx.forbidden('You do not own this vacancy')
    }
    if ((vacancy as any).moderationStatus !== 'published') {
      return ctx.badRequest('Vacancy must be published')
    }
    if ((vacancy as any).topPlacement) {
      return ctx.badRequest('Vacancy already has TOP placement')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob TOP: ${(vacancy as any).title}`,
      description: 'Закрепить вакансию в TOP выдачи',
      payload: { type: 'top_placement', vacancyDocumentId: vacancyId, userId: user.id },
      starsAmount: TOP_PLACEMENT_PRICE_STARS,
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
