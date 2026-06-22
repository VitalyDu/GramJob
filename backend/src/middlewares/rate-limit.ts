import ratelimit from 'koa-ratelimit'

// Koa Middleware type — koa is a peer dep of @strapi/strapi and not directly installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Middleware = (ctx: any, next: () => Promise<void>) => Promise<void>

interface RateLimitOptions {
  max?: number
  duration?: number
}

export interface RateLimitConfig {
  driver: 'memory'
  db: Map<string, unknown>
  duration: number
  max: number
  errorMessage: string
  id: (ctx: { ip: string }) => string
  disableHeader: boolean
  headers: {
    remaining: string
    reset: string
    total: string
  }
}

export function buildRateLimitOptions(options: RateLimitOptions): RateLimitConfig {
  return {
    driver: 'memory',
    db: new Map(),
    duration: options.duration ?? 60000,
    max: options.max ?? 100,
    errorMessage: 'Too many requests. Please try again later.',
    id: (ctx) => ctx.ip,
    disableHeader: false,
    headers: {
      remaining: 'Rate-Limit-Remaining',
      reset: 'Rate-Limit-Reset',
      total: 'Rate-Limit-Total',
    },
  }
}

// Separate db instances per limit type to avoid interference
export const apiRateLimit: Middleware = ratelimit(
  buildRateLimitOptions({ max: 100, duration: 60000 })
)
export const authRateLimit: Middleware = ratelimit(
  buildRateLimitOptions({ max: 10, duration: 60000 })
)
