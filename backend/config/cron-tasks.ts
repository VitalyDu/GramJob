import type { Core } from '@strapi/strapi'

export default {
  // Every hour at minute 0
  '0 * * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      const now = new Date().toISOString()

      const expired = await strapi.documents('api::vacancy.vacancy').findMany({
        filters: {
          status: { $eq: 'published' },
          expiresAt: { $lt: now },
        },
        fields: ['documentId', 'title'],
      })

      if (expired.length === 0) return

      strapi.log.info(`[cron] Expiring ${expired.length} vacancies`)

      for (const vacancy of expired) {
        await strapi.documents('api::vacancy.vacancy').update({
          documentId: vacancy.documentId,
          data: { status: 'expired' },
        })
        strapi.log.info(`[cron] Vacancy ${vacancy.documentId} ("${vacancy.title}") expired`)
        // TODO Sprint 7: send Telegram notification vacancy_expiring_soon to postedBy user
      }
    },
    options: {
      tz: 'UTC',
    },
  },
}
