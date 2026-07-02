import { authRateLimit } from './rate-limit'

export default () => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.path.startsWith('/api/auth/')) {
      return authRateLimit(ctx, next)
    }
    return next()
  }
}
