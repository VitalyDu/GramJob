import type { Core } from '@strapi/strapi'

export async function configurePasswordReset(strapi: Core.Strapi): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL
  if (!frontendUrl) {
    strapi.log.warn('[auth] FRONTEND_URL not set — reset password URL not configured')
    return
  }

  const url = `${frontendUrl.replace(/\/$/, '')}/reset-password`
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' })
  const advanced = ((await store.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>

  if (advanced.email_reset_password === url) return

  await store.set({ key: 'advanced', value: { ...advanced, email_reset_password: url } })
  strapi.log.info(`[auth] Reset password URL set to ${url}`)
}
