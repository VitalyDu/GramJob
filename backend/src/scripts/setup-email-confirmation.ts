import type { Core } from '@strapi/strapi'

export async function configureEmailConfirmation(strapi: Core.Strapi): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL
  if (!frontendUrl) {
    strapi.log.warn('[auth] FRONTEND_URL not set — email confirmation not configured')
    return
  }

  const redirect = `${frontendUrl.replace(/\/$/, '')}/email-confirmed`
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' })
  const advanced = ((await store.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>

  if (
    advanced.email_confirmation === true &&
    advanced.email_confirmation_redirection === redirect
  ) {
    return
  }

  await store.set({
    key: 'advanced',
    value: { ...advanced, email_confirmation: true, email_confirmation_redirection: redirect },
  })
  strapi.log.info(`[auth] Email confirmation enabled, redirect: ${redirect}`)
}
