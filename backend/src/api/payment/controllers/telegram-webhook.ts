import type { Core } from '@strapi/strapi'
import { answerPreCheckoutQuery, parseInvoicePayload } from '../services/telegram-bot'
import { activateSubscription, addCredits } from '../services/subscription-service'
import { handleBotCommand } from '../services/bot-commands'

type TelegramUser = { id: number; first_name?: string }

type PreCheckoutQuery = {
  id: string
  from: TelegramUser
  currency: string
  total_amount: number
  invoice_payload: string
}

type SuccessfulPayment = {
  currency: string
  total_amount: number
  invoice_payload: string
  telegram_payment_charge_id: string
}

type TelegramUpdate = {
  update_id: number
  pre_checkout_query?: PreCheckoutQuery
  message?: {
    from?: TelegramUser
    chat?: { id: number }
    text?: string
    successful_payment?: SuccessfulPayment
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async handle(ctx: any) {
    // Verify Telegram webhook secret
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const incoming = ctx.request.headers['x-telegram-bot-api-secret-token']
      if (incoming !== secret) {
        ctx.status = 403
        ctx.body = { ok: false }
        return
      }
    }

    const update = ctx.request.body as TelegramUpdate

    if (update.pre_checkout_query) {
      await handlePreCheckout(update.pre_checkout_query)
    } else if (update.message?.successful_payment) {
      await handleSuccessfulPayment(strapi, update.message.successful_payment)
    } else if (update.message?.text?.startsWith('/')) {
      const chatId = String(update.message.chat?.id ?? update.message.from?.id ?? '')
      if (chatId) {
        await handleBotCommand(strapi, chatId, update.message.text)
      }
    }

    // Always respond 200 to Telegram
    ctx.status = 200
    ctx.body = { ok: true }
  },
})

async function handlePreCheckout(query: PreCheckoutQuery): Promise<void> {
  try {
    parseInvoicePayload(query.invoice_payload)
    await answerPreCheckoutQuery(query.id, true)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid payment data'
    await answerPreCheckoutQuery(query.id, false, msg)
  }
}

async function handleSuccessfulPayment(
  strapi: Core.Strapi,
  payment: SuccessfulPayment
): Promise<void> {
  let data: ReturnType<typeof parseInvoicePayload>

  try {
    data = parseInvoicePayload(payment.invoice_payload)
  } catch {
    strapi.log.error('[payment] Cannot parse invoice_payload:', payment.invoice_payload)
    return
  }

  try {
    if (data.type === 'subscription') {
      await activateSubscription(strapi, data.userId, data.planCode as any)
    } else if (data.type === 'vacancy_pack') {
      const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
        where: { id: data.packageId },
      })) as { vacancyCredits: number } | null

      if (!pack) {
        strapi.log.error(`[payment] VacancyPackage id=${data.packageId} not found`)
        return
      }
      await addCredits(strapi, data.userId, 'vacancy', pack.vacancyCredits)
    } else if (data.type === 'apply_pack') {
      const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
        where: { id: data.packageId },
      })) as { applyCredits: number } | null

      if (!pack) {
        strapi.log.error(`[payment] ApplyPackage id=${data.packageId} not found`)
        return
      }
      await addCredits(strapi, data.userId, 'apply', pack.applyCredits)
    }

    strapi.log.info(
      `[payment] successful_payment processed: type=${data.type} userId=${data.userId} charge=${payment.telegram_payment_charge_id}`
    )
  } catch (err) {
    strapi.log.error('[payment] Failed to process successful_payment:', err)
  }
}
