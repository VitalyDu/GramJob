import { apiRateLimit, authRateLimit } from './middlewares/rate-limit'
import { seedIndustries } from './scripts/seed-industries'
import { seedSubscriptionPlans } from './scripts/seed-subscription-plans'
import { seedPackages } from './scripts/seed-packages'
import { seedPermissions } from './scripts/seed-permissions'
import { setWebhook } from './api/payment/services/telegram-bot'
import type { Core } from '@strapi/strapi'

async function setupVacancySearch(strapi: Core.Strapi) {
  try {
    await strapi.db.connection.raw(`
      ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS search_vector tsvector;
      CREATE INDEX IF NOT EXISTS vacancies_search_idx ON vacancies USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS vacancies_skills_idx ON vacancies USING GIN(skills jsonb_path_ops);
      CREATE INDEX IF NOT EXISTS vacancies_languages_idx ON vacancies USING GIN(languages jsonb_path_ops);
      CREATE INDEX IF NOT EXISTS vacancies_status_expires_idx ON vacancies (status, expires_at);
    `)
    strapi.log.info('[vacancy] Full-text search indexes ensured')
  } catch (err) {
    // Table may not exist on very first boot before content types sync
    strapi.log.warn('[vacancy] search index setup skipped (will retry on next boot)')
  }
}

export default {
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedIndustries(strapi)
    await setupVacancySearch(strapi)
    await seedSubscriptionPlans(strapi)
    await seedPackages(strapi)
    await seedPermissions(strapi)

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

    if (botToken && webhookUrl) {
      try {
        await setWebhook(webhookUrl, webhookSecret)
        strapi.log.info(`[telegram] Webhook registered: ${webhookUrl}`)
      } catch (err) {
        strapi.log.warn('[telegram] Failed to register webhook (bot may not be configured):', err)
      }
    }

    const app = strapi.server.app

    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/auth/')) {
        return authRateLimit(ctx, next)
      }
      return next()
    })

    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/')) {
        return apiRateLimit(ctx, next)
      }
      return next()
    })
  },
}
