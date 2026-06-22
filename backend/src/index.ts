import { apiRateLimit, authRateLimit } from './middlewares/rate-limit'
import type { Core } from '@strapi/strapi'

export default {
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const app = strapi.server.app

    // Stricter limit for auth endpoints
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/auth/')) {
        return authRateLimit(ctx, next)
      }
      return next()
    })

    // General limit for all API endpoints
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/')) {
        return apiRateLimit(ctx, next)
      }
      return next()
    })
  },
}
