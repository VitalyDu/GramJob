import type { Core } from '@strapi/strapi'
import { validateInitData, parseInitData } from '../api/telegram-auth/services/telegram-validation'

/**
 * Global middleware: accepts X-Telegram-Init-Data header as auth.
 * On valid initData issues a standard users-permissions JWT and injects it
 * into the Authorization header, so the regular auth strategy chain
 * (permissions, policies, ctx.state.user) works unchanged downstream.
 * Requests that already carry an Authorization header pass through untouched.
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const initDataHeader = ctx.request.headers['x-telegram-init-data'] as string | undefined

    if (!initDataHeader || ctx.request.headers.authorization) {
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

    const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id })
    ctx.request.headers.authorization = `Bearer ${jwt}`

    await next()
  }
}
