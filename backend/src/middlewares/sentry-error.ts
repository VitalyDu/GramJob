import { Sentry } from '../sentry'

/**
 * Catches unhandled exceptions from downstream middleware/controllers and
 * forwards them to Sentry before rethrowing. Runs after strapi::errors so
 * we still see the intended JSON response — Sentry gets the raw error.
 */
export default () => {
  return async (ctx: any, next: () => Promise<void>) => {
    try {
      await next()
      // Some Strapi controllers set ctx.status directly instead of throwing;
      // capture those 5xx too, but skip 4xx business errors
      if (ctx.status >= 500 && ctx.status !== 503) {
        Sentry.withScope((scope) => {
          scope.setTag('method', ctx.method)
          scope.setTag('path', ctx.path)
          scope.setContext('request', {
            method: ctx.method,
            url: ctx.url,
            status: ctx.status,
          })
          Sentry.captureMessage(`HTTP ${ctx.status} at ${ctx.method} ${ctx.path}`, 'error')
        })
      }
    } catch (err) {
      Sentry.withScope((scope) => {
        scope.setTag('method', ctx.method)
        scope.setTag('path', ctx.path)
        if (ctx.state?.user?.id) {
          scope.setUser({ id: String(ctx.state.user.id) })
        }
        Sentry.captureException(err)
      })
      throw err
    }
  }
}
