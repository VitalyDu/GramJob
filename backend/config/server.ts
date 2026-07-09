import type { Core } from '@strapi/strapi'
import cronTasks from './cron-tasks'

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Behind a reverse proxy ctx.ip must come from X-Forwarded-For,
  // otherwise all users share the proxy IP (rate limits, uniqueViews)
  proxy: env.bool('IS_PROXIED', true),
  app: {
    keys: env.array('APP_KEYS') ?? [],
  },
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
})

export default config
