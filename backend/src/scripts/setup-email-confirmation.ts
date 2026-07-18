import type { Core } from '@strapi/strapi'

interface EmailTemplate {
  display?: string
  icon?: string
  options?: {
    from?: { name?: string; email?: string }
    response_email?: string
    object?: string
    message?: string
  }
}

interface EmailStore {
  reset_password?: EmailTemplate
  email_confirmation?: EmailTemplate
}

export async function configureEmailConfirmation(strapi: Core.Strapi): Promise<void> {
  const rawFrontendUrl = process.env.FRONTEND_URL
  if (!rawFrontendUrl) {
    strapi.log.warn('[auth] FRONTEND_URL not set — email confirmation not configured')
    return
  }

  // Take only the first URL in case FRONTEND_URL is comma-separated (like in CORS config)
  const frontendUrl = (rawFrontendUrl.split(',')[0] ?? rawFrontendUrl).trim()
  const redirect = `${frontendUrl.replace(/\/$/, '')}/email-confirmed`
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' })
  const advanced = ((await store.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>

  const advancedChanged =
    advanced.email_confirmation !== true || advanced.email_confirmation_redirection !== redirect

  if (advancedChanged) {
    await store.set({
      key: 'advanced',
      value: { ...advanced, email_confirmation: true, email_confirmation_redirection: redirect },
    })
    strapi.log.info(`[auth] Email confirmation enabled, redirect: ${redirect}`)
  }

  // Rebrand шаблонов: strapi-defaults подставляют "no-reply@strapi.io" и
  // "Administration Panel". Меняем на env-значения (EMAIL_FROM, EMAIL_FROM_NAME).
  const fromEmail = process.env.EMAIL_FROM ?? 'noreply@gramjob.com'
  const fromName = process.env.EMAIL_FROM_NAME ?? 'GramJob'
  const emails = ((await store.get({ key: 'email' })) ?? {}) as EmailStore
  const needsRebrand = (tpl: EmailTemplate | undefined): boolean =>
    tpl?.options?.from?.email !== fromEmail || tpl?.options?.from?.name !== fromName

  if (needsRebrand(emails.reset_password) || needsRebrand(emails.email_confirmation)) {
    const applyFrom = (tpl: EmailTemplate | undefined): EmailTemplate => ({
      ...(tpl ?? {}),
      options: {
        ...(tpl?.options ?? {}),
        from: { name: fromName, email: fromEmail },
      },
    })
    await store.set({
      key: 'email',
      value: {
        ...emails,
        reset_password: applyFrom(emails.reset_password),
        email_confirmation: applyFrom(emails.email_confirmation),
      } satisfies EmailStore,
    })
    strapi.log.info(`[auth] Email templates rebranded to ${fromName} <${fromEmail}>`)
  }
}
