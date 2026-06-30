import type { Core } from '@strapi/strapi'
import {
  buildVacancyFiltersFromSaved,
  buildResumeFiltersFromSaved,
} from '../src/api/saved-search/services/saved-search-utils'
import { sendNotification } from '../src/services/notification.service'

export default {
  // Every hour at minute 0: expire vacancies
  '0 * * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const now = new Date().toISOString()

        const expired = await (strapi.documents as any)('api::vacancy.vacancy').findMany({
          filters: {
            status: { $eq: 'published' },
            expiresAt: { $lt: now },
          },
          fields: ['documentId', 'title'],
          populate: { postedBy: { fields: ['id'] } },
          limit: 1000,
        })

        if (expired.length === 0) return

        strapi.log.info(`[cron] Expiring ${expired.length} vacancies`)

        for (const vacancy of expired) {
          await (strapi.documents as any)('api::vacancy.vacancy').update({
            documentId: vacancy.documentId,
            data: { status: 'expired' },
          })

          const posterId = (vacancy as any).postedBy?.id
          if (posterId) {
            await sendNotification(strapi, {
              userId: posterId,
              type: 'vacancy_expired',
              templateData: {
                vacancyTitle: (vacancy as any).title ?? '',
                vacancyId: vacancy.documentId ?? '',
              },
            })
          }
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to expire vacancies', err)
      }
    },
    options: {
      tz: 'UTC',
    },
  },

  // Every 2 hours: check saved searches for new results and notify
  '0 */2 * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const searches = await (strapi.documents as any)('api::saved-search.saved-search').findMany(
          {
            fields: ['documentId', 'type', 'filters', 'lastNotifiedAt', 'createdAt'],
            populate: { user: { fields: ['id', 'telegramId'] } },
            limit: 5000,
          }
        )

        if (searches.length === 0) return

        strapi.log.info(`[cron] Checking ${searches.length} saved searches`)

        for (const search of searches) {
          try {
            const since = search.lastNotifiedAt ?? search.createdAt
            const savedFilters = (search.filters ?? {}) as Record<string, unknown>

            let newCount = 0

            if (search.type === 'vacancy') {
              const filters = {
                ...buildVacancyFiltersFromSaved(savedFilters),
                createdAt: { $gt: since },
              }
              newCount = await (strapi.documents as any)('api::vacancy.vacancy').count({ filters })
            } else if (search.type === 'resume') {
              const filters = {
                ...buildResumeFiltersFromSaved(savedFilters),
                createdAt: { $gt: since },
              }
              newCount = await (strapi.documents as any)('api::resume.resume').count({ filters })
            }

            if (newCount > 0) {
              strapi.log.info(
                `[cron] SavedSearch ${search.documentId}: ${newCount} new ${search.type}(s) for user ${search.user?.id}`
              )

              if (search.user?.id) {
                await sendNotification(strapi, {
                  userId: search.user.id,
                  type: 'saved_search_match',
                  templateData: {
                    count: newCount,
                    searchType: search.type,
                  },
                })
              }

              await (strapi.documents as any)('api::saved-search.saved-search').update({
                documentId: search.documentId,
                data: { lastNotifiedAt: new Date().toISOString() },
              })
            }
          } catch (searchErr) {
            strapi.log.warn(`[cron] Failed to check saved search ${search.documentId}`, searchErr)
          }
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to process saved searches', err)
      }
    },
    options: {
      tz: 'UTC',
    },
  },

  // Daily at 02:00 UTC: expire subscriptions
  '0 2 * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const now = new Date().toISOString()

        const expiredUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
          where: {
            subscriptionPlan: { $notIn: ['free'] },
            subscriptionExpiresAt: { $lte: now },
          },
          select: ['id', 'subscriptionPlan'],
          limit: 1000,
        })

        if (expiredUsers.length === 0) return

        strapi.log.info(`[cron] Expiring ${expiredUsers.length} user subscriptions`)

        for (const user of expiredUsers) {
          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: { subscriptionPlan: 'free', subscriptionExpiresAt: null, isVip: false },
          })
          strapi.log.info(`[cron] User ${user.id} plan=${user.subscriptionPlan} → free (expired)`)

          await sendNotification(strapi, {
            userId: user.id,
            type: 'subscription_expired',
            templateData: { plan: user.subscriptionPlan },
          })
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to expire subscriptions', err)
      }
    },
    options: { tz: 'UTC' },
  },

  // Daily at 09:00 UTC: subscription 7-day warning + vacancy expiring in 3 days
  '0 9 * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        // 1. Subscription 7-day warning
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)

        const expiringUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
          where: {
            subscriptionPlan: { $notIn: ['free'] },
            subscriptionExpiresAt: {
              $gt: sixDaysFromNow.toISOString(),
              $lte: sevenDaysFromNow.toISOString(),
            },
          },
          select: ['id', 'subscriptionPlan'],
          limit: 1000,
        })

        strapi.log.info(`[cron] ${expiringUsers.length} subscriptions expiring in 7 days`)

        for (const user of expiringUsers) {
          await sendNotification(strapi, {
            userId: user.id,
            type: 'subscription_expiring',
            templateData: { plan: user.subscriptionPlan },
          })
        }

        // 2. Vacancies expiring in 3 days
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

        const expiringSoonVacancies = await (strapi.documents as any)(
          'api::vacancy.vacancy'
        ).findMany({
          filters: {
            status: { $eq: 'published' },
            expiresAt: {
              $gt: twoDaysFromNow.toISOString(),
              $lte: threeDaysFromNow.toISOString(),
            },
          },
          fields: ['documentId', 'title'],
          populate: { postedBy: { fields: ['id'] } },
          limit: 1000,
        })

        strapi.log.info(`[cron] ${expiringSoonVacancies.length} vacancies expiring in 3 days`)

        for (const vacancy of expiringSoonVacancies) {
          const posterId = (vacancy as any).postedBy?.id
          if (posterId) {
            await sendNotification(strapi, {
              userId: posterId,
              type: 'vacancy_expiring_soon',
              templateData: {
                vacancyTitle: (vacancy as any).title ?? '',
                vacancyId: vacancy.documentId ?? '',
              },
            })
          }
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to process daily 09:00 notifications', err)
      }
    },
    options: { tz: 'UTC' },
  },

  // Daily 18:00 UTC: vacancy views digest (notify employer if ≥5 views yesterday)
  '0 18 * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const yesterday = new Date()
        yesterday.setUTCDate(yesterday.getUTCDate() - 1)
        const yesterdayDate = yesterday.toISOString().slice(0, 10)

        const records = (await strapi.db
          .query('api::vacancy-analytics.vacancy-analytics')
          .findMany({
            where: { date: yesterdayDate, views: { $gte: 5 } },
            populate: {
              vacancy: {
                select: ['documentId', 'title'],
                populate: { postedBy: { select: ['id'] } },
              },
            },
            limit: 1000,
          })) as Array<{
          views: number
          vacancy?: { documentId?: string; title?: string; postedBy?: { id?: number } }
        }>

        strapi.log.info(
          `[cron] ${records.length} vacancies with ≥5 views yesterday (${yesterdayDate})`
        )

        for (const record of records) {
          const posterId = record.vacancy?.postedBy?.id
          if (posterId) {
            await sendNotification(strapi, {
              userId: posterId,
              type: 'vacancy_viewed',
              templateData: {
                vacancyTitle: record.vacancy?.title ?? '',
                vacancyId: record.vacancy?.documentId ?? '',
                views: record.views,
              },
            })
          }
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to send vacancy views digest', err)
      }
    },
    options: { tz: 'UTC' },
  },

  // Weekly Sunday 00:00 UTC: delete read notifications older than 30 days
  '0 0 * * 0': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const result = await strapi.db.query('api::notification.notification').deleteMany({
          where: {
            isRead: true,
            createdAt: { $lt: thirtyDaysAgo },
          },
        })

        strapi.log.info(`[cron] Deleted old read notifications (older than 30 days)`)
      } catch (err) {
        strapi.log.error('[cron] Failed to cleanup notifications', err)
      }
    },
    options: { tz: 'UTC' },
  },
}
