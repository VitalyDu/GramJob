import type { Core } from '@strapi/strapi'
import { validateInitData, parseInitData } from '../api/telegram-auth/services/telegram-validation'

/**
 * Route-level middleware: accepts X-Telegram-Init-Data header as auth.
 * If the header is present and valid, sets ctx.state.user from DB.
 * If the header is absent, passes through to standard JWT auth.
 * If the header is present but invalid, returns 401.
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const initDataHeader = ctx.request.headers['x-telegram-init-data'] as string | undefined

    if (!initDataHeader) {
      return next()
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      ctx.status = 500
      ctx.body = { error: { message: 'Telegram bot not configured' } }
      return
    }

    const params = validateInitData(initDataHeader, botToken)
    if (!params) {
      ctx.status = 401
      ctx.body = { error: { message: 'Invalid or expired Telegram initData' } }
      return
    }

    const telegramUser = parseInitData(params)
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { telegramId: String(telegramUser.id) },
    })

    if (!user) {
      ctx.status = 401
      ctx.body = {
        error: { message: 'Telegram user not registered. Call POST /api/auth/telegram first.' },
      }
      return
    }

    if (user.blocked) {
      ctx.status = 401
      ctx.body = { error: { message: 'User account is blocked' } }
      return
    }

    ctx.state.user = user
    ctx.state.auth = { strategy: { name: 'telegram-init-data' }, credentials: user }

    await next()
  }
}
