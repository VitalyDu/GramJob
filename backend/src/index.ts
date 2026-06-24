import { apiRateLimit, authRateLimit } from './middlewares/rate-limit'
import { seedIndustries } from './scripts/seed-industries'
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
