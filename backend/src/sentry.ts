import * as Sentry from '@sentry/node'

let initialized = false

export function initSentry(): boolean {
  if (initialized) return true

  const dsn = process.env.SENTRY_DSN
  if (!dsn) return false

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // Strapi already logs and returns 4xx as expected business errors — only
    // capture server-side failures and uncaught rejections
    beforeSend(event, hint) {
      const err = hint?.originalException as { status?: number; statusCode?: number } | undefined
      const status = err?.status ?? err?.statusCode
      if (typeof status === 'number' && status < 500) return null
      return event
    },
  })

  initialized = true
  return true
}

export { Sentry }
