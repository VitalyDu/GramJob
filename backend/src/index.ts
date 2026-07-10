import { seedIndustries } from './scripts/seed-industries'
import { seedSubscriptionPlans } from './scripts/seed-subscription-plans'
import { seedPackages } from './scripts/seed-packages'
import { seedPermissions } from './scripts/seed-permissions'
import { configurePasswordReset } from './scripts/setup-password-reset'
import { configureEmailConfirmation } from './scripts/setup-email-confirmation'
import { setWebhook } from './api/payment/services/telegram-bot'
import { registerModerationRoutes } from './services/moderation-routes'
import type { Core } from '@strapi/strapi'

async function setupVacancySearch(strapi: Core.Strapi) {
  try {
    await strapi.db.connection.raw(`
      ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS search_vector tsvector;
      CREATE INDEX IF NOT EXISTS vacancies_search_idx ON vacancies USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS vacancies_skills_idx ON vacancies USING GIN(skills jsonb_path_ops);
      CREATE INDEX IF NOT EXISTS vacancies_languages_idx ON vacancies USING GIN(languages jsonb_path_ops);
      CREATE INDEX IF NOT EXISTS vacancies_status_expires_idx ON vacancies (status, expires_at);
      UPDATE vacancies SET boosted_at = created_at WHERE boosted_at IS NULL;
    `)
    strapi.log.info('[vacancy] Full-text search indexes ensured')
  } catch (err) {
    // Table may not exist on very first boot before content types sync
    strapi.log.warn('[vacancy] search index setup skipped (will retry on next boot)')
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerModerationRoutes(strapi)
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedIndustries(strapi)
    await setupVacancySearch(strapi)
    await seedSubscriptionPlans(strapi)
    await seedPackages(strapi)
    await seedPermissions(strapi)
    await configurePasswordReset(strapi)
    await configureEmailConfirmation(strapi)

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
  },
}
