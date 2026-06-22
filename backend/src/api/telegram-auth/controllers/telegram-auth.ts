import type { Core } from '@strapi/strapi'
import {
  validateInitData,
  validateWebWidget,
  parseInitData,
  type TelegramUser,
} from '../services/telegram-validation'

const SAFE_USER_FIELDS = [
  'id',
  'email',
  'telegramId',
  'firstName',
  'lastName',
  'avatar',
  'language',
  'subscriptionPlan',
  'subscriptionExpiresAt',
  'vacancyCredits',
  'applyCredits',
  'createdAt',
] as const

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async telegram(ctx: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return ctx.internalServerError('Telegram bot not configured')
    }

    const body = ctx.request.body as { initData?: string; telegramData?: Record<string, string> }
    let telegramUser: TelegramUser | null = null

    if (body.initData) {
      const params = validateInitData(body.initData, botToken)
      if (!params) {
        return ctx.badRequest('Invalid or expired Telegram initData')
      }
      telegramUser = parseInitData(params)
    } else if (body.telegramData) {
      if (!validateWebWidget(body.telegramData, botToken)) {
        return ctx.badRequest('Invalid Telegram Web Widget data')
      }
      telegramUser = {
        id: parseInt(String(body.telegramData.id), 10),
        first_name: body.telegramData.first_name ?? '',
        last_name: body.telegramData.last_name,
        username: body.telegramData.username,
        photo_url: body.telegramData.photo_url,
        language_code: body.telegramData.language_code,
      }
    } else {
      return ctx.badRequest('initData or telegramData is required')
    }

    const telegramId = String(telegramUser.id)

    let user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { telegramId },
      select: [...SAFE_USER_FIELDS],
    })

    if (!user) {
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } })

      user = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          telegramId,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name ?? null,
          username: `tg_${telegramId}`,
          email: null,
          confirmed: true,
          blocked: false,
          role: role?.id,
          subscriptionPlan: 'free',
          vacancyCredits: 0,
          applyCredits: 0,
          language: telegramUser.language_code === 'ru' ? 'ru' : 'en',
        },
        select: [...SAFE_USER_FIELDS],
      })
    }

    const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id })

    ctx.send({ jwt, user })
  },
})
