import type { Core } from '@strapi/strapi'
import { createPaymentIntent, buildTransactionParams, confirmIntent } from '../services/ton-payment'
import { URGENT_PRICE_STARS, TOP_PLACEMENT_PRICE_STARS } from '../services/telegram-bot'
import { verifyTonPayWebhookSignature } from '../services/ton-webhook-verify'
import type { PaymentIntentPayload } from '../services/payment-types'

type UserWithPlan = { id: number; subscriptionPlan: string }

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createIntent(ctx: any) {
    const user = ctx.state.user as UserWithPlan
    const body = ctx.request.body as {
      kind?: 'subscription' | 'vacancy_pack' | 'apply_pack' | 'urgent' | 'top_placement'
      planCode?: string
      packageId?: number
      vacancyId?: string
    }

    if (!body.kind) return ctx.badRequest('kind is required')

    let payload: PaymentIntentPayload
    let starsPrice: number

    if (body.kind === 'subscription') {
      if (!body.planCode || !['pro', 'max', 'vip'].includes(body.planCode)) {
        return ctx.badRequest('planCode must be pro|max|vip')
      }
      if (
        body.planCode === 'vip' &&
        user.subscriptionPlan !== 'max' &&
        user.subscriptionPlan !== 'vip'
      ) {
        return ctx.forbidden('VIP requires an active Max subscription')
      }
      const plan = await (strapi.documents as any)(
        'api::subscription-plan.subscription-plan'
      ).findFirst({ filters: { code: { $eq: body.planCode } } })
      if (!plan?.starsPrice) return ctx.notFound('Plan not found')
      payload = { type: 'subscription', planCode: body.planCode, userId: user.id }
      starsPrice = plan.starsPrice
    } else if (body.kind === 'vacancy_pack') {
      if (!body.packageId) return ctx.badRequest('packageId required')
      const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
        where: { id: body.packageId },
      })) as { id: number; starsPrice: number } | null
      if (!pack) return ctx.notFound('Vacancy package not found')
      payload = { type: 'vacancy_pack', packageId: pack.id, userId: user.id }
      starsPrice = pack.starsPrice
    } else if (body.kind === 'apply_pack') {
      if (!body.packageId) return ctx.badRequest('packageId required')
      const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
        where: { id: body.packageId },
      })) as { id: number; starsPrice: number } | null
      if (!pack) return ctx.notFound('Apply package not found')
      payload = { type: 'apply_pack', packageId: pack.id, userId: user.id }
      starsPrice = pack.starsPrice
    } else if (body.kind === 'urgent' || body.kind === 'top_placement') {
      if (!body.vacancyId) return ctx.badRequest('vacancyId required')
      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: body.vacancyId,
        fields: ['documentId', 'moderationStatus', 'urgent', 'topPlacement'],
        populate: { postedBy: { fields: ['id'] } },
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')
      if ((vacancy as any).postedBy?.id !== user.id) return ctx.forbidden('Not owner')
      if ((vacancy as any).moderationStatus !== 'published') return ctx.badRequest('Not published')

      const flag = body.kind === 'urgent' ? 'urgent' : 'topPlacement'
      if ((vacancy as any)[flag]) return ctx.badRequest(`Already ${flag}`)

      payload =
        body.kind === 'urgent'
          ? { type: 'urgent', vacancyDocumentId: body.vacancyId, userId: user.id }
          : { type: 'top_placement', vacancyDocumentId: body.vacancyId, userId: user.id }
      starsPrice = body.kind === 'urgent' ? URGENT_PRICE_STARS : TOP_PLACEMENT_PRICE_STARS
    } else {
      return ctx.badRequest('Unknown kind')
    }

    // Check for existing processing intent to avoid duplicates on retry
    const existingIntent = (await strapi.db.query('api::payment.payment').findOne({
      where: {
        provider: 'ton',
        status: 'processing',
        user: user.id,
        payloadType: payload.type,
        ...(payload.type === 'subscription' ? { planCode: (payload as any).planCode } : {}),
        ...(payload.type === 'vacancy_pack' || payload.type === 'apply_pack'
          ? { packageId: (payload as any).packageId }
          : {}),
        ...(payload.type === 'urgent' || payload.type === 'top_placement'
          ? { vacancyDocumentId: (payload as any).vacancyDocumentId }
          : {}),
      },
    })) as { intentId: string } | null

    if (existingIntent?.intentId) {
      const txParams = buildTransactionParams({ intentId: existingIntent.intentId, starsPrice })
      ctx.body = { intentId: existingIntent.intentId, txParams }
      return
    }

    const result = await createPaymentIntent(strapi, {
      userId: user.id,
      payload,
      starsPrice,
    })
    ctx.body = result
  },

  async getIntentStatus(ctx: any) {
    const user = ctx.state.user as { id: number }
    const { intentId } = ctx.params as { intentId: string }
    const row = (await strapi.db.query('api::payment.payment').findOne({
      where: { intentId, user: user.id },
    })) as { status: string; tonTxHash: string | null } | null
    if (!row) return ctx.notFound('Intent not found')
    ctx.body = { status: row.status, tonTxHash: row.tonTxHash }
  },

  async webhook(ctx: any) {
    const secret = process.env.TON_PAY_WEBHOOK_SECRET
    if (!secret) {
      strapi.log.error('[ton-webhook] TON_PAY_WEBHOOK_SECRET not set')
      ctx.status = 503
      return
    }

    // MVP: JSON.stringify may not be byte-for-bit identical to what the provider signed.
    // A rawBody middleware is needed for production — cron poller covers the gap meanwhile.
    const rawBody = JSON.stringify(ctx.request.body)
    const sig = ctx.request.headers['x-signature'] as string | undefined
    if (typeof sig !== 'string' || !verifyTonPayWebhookSignature(rawBody, sig, secret)) {
      ctx.status = 403
      return
    }

    const body = ctx.request.body as {
      intentId?: string
      txHash?: string
      amount?: string
    }
    if (!body.intentId || !body.txHash || !body.amount) {
      ctx.status = 400
      return
    }

    try {
      const result = await confirmIntent(strapi, {
        intentId: body.intentId,
        tonTxHash: body.txHash,
        usdtNanoReceived: BigInt(body.amount),
      })
      ctx.body = { result }
    } catch (err) {
      strapi.log.error('[ton-webhook] confirmIntent failed:', err)
      ctx.status = 500
      ctx.body = { error: 'internal' }
    }
  },
})
