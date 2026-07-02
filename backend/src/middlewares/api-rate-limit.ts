import { apiRateLimit } from './rate-limit'

export default () => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.path.startsWith('/api/')) {
      return apiRateLimit(ctx, next)
    }
    return next()
  }
}
