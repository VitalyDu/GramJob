import type { Core } from '@strapi/strapi'
import { sendNotification } from '../src/services/notification.service'
import { computeDelta, yesterdayUTC } from '../src/services/analytics.service'

export default {
  // Every hour at minute 0: expire vacancies
  expireVacancies: {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const now = new Date().toISOString()

        const expired = await (strapi.documents as any)('api::vacancy.vacancy').findMany({
          filters: {
            moderationStatus: { $eq: 'published' },
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
            data: { moderationStatus: 'expired' },
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
      rule: '0 * * * *',
      tz: 'UTC',
    },
  },

  // Daily at 02:00 UTC: expire subscriptions
  expireSubscriptions: {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const now = new Date().toISOString()

        const expiredUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
          where: {
            subscriptionPlan: { $notIn: ['free'] },
            subscriptionExpiresAt: { $lte: now },
          },
          select: ['id', 'subscriptionPlan', 'isVip'],
          limit: 1000,
        })

        if (expiredUsers.length === 0) return

        strapi.log.info(`[cron] Expiring ${expiredUsers.length} user subscriptions`)

        for (const user of expiredUsers as Array<{
          id: number
          subscriptionPlan: string
          isVip?: boolean
        }>) {
          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: { subscriptionPlan: 'free', subscriptionExpiresAt: null, isVip: false },
          })

          // VIP users had their vacancies highlighted — remove the highlight on expiry
          if (user.isVip) {
            await strapi.db.connection.raw(
              `UPDATE vacancies SET highlighted = false WHERE posted_by_id = ? AND highlighted = true`,
              [user.id]
            )
            strapi.log.info(`[cron] User ${user.id} VIP expired: vacancies un-highlighted`)
          }

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
    options: { rule: '0 2 * * *', tz: 'UTC' },
  },

  // Daily at 09:00 UTC: subscription 7-day warning + vacancy expiring in 3 days
  dailyWarnings: {
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
            moderationStatus: { $eq: 'published' },
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
    options: { rule: '0 9 * * *', tz: 'UTC' },
  },

  // Daily 18:00 UTC: vacancy views digest (notify employer if ≥5 views yesterday)
  vacancyViewsDigest: {
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

        // Aggregate by vacancy to avoid duplicate notifications if analytics records were duplicated
        const byVacancy = new Map<
          string,
          { posterId: number; title: string; vacancyId: string; totalViews: number }
        >()
        for (const record of records) {
          const vacancyId = record.vacancy?.documentId
          const posterId = record.vacancy?.postedBy?.id
          if (!vacancyId || !posterId) continue
          const agg = byVacancy.get(vacancyId)
          if (agg) {
            agg.totalViews += record.views
          } else {
            byVacancy.set(vacancyId, {
              posterId,
              title: record.vacancy?.title ?? '',
              vacancyId,
              totalViews: record.views,
            })
          }
        }

        strapi.log.info(
          `[cron] ${byVacancy.size} vacancies with ≥5 views yesterday (${yesterdayDate}), ${records.length} raw records`
        )

        for (const { posterId, title, vacancyId, totalViews } of byVacancy.values()) {
          await sendNotification(strapi, {
            userId: posterId,
            type: 'vacancy_viewed',
            templateData: {
              vacancyTitle: title,
              vacancyId,
              views: totalViews,
            },
          })
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to send vacancy views digest', err)
      }
    },
    options: { rule: '0 18 * * *', tz: 'UTC' },
  },

  // Weekly Sunday 00:00 UTC: delete read notifications older than 30 days
  cleanupNotifications: {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        await strapi.db.query('api::notification.notification').deleteMany({
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
    options: { rule: '0 0 * * 0', tz: 'UTC' },
  },

  // Daily 01:00 UTC: aggregate analytics for yesterday
  aggregateAnalytics: {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      const date = yesterdayUTC()
      strapi.log.info(`[cron] Aggregating analytics for ${date}`)

      try {
        // --- Vacancy Analytics ---
        const vacancies = (await (strapi.documents as any)('api::vacancy.vacancy').findMany({
          filters: { moderationStatus: { $in: ['published', 'expired', 'archived'] } },
          fields: ['documentId', 'views', 'uniqueViews', 'applicationsCount'],
          limit: 10000,
        })) as Array<{
          id: number
          documentId: string
          views: number
          uniqueViews: number
          applicationsCount: number
        }>

        for (const vacancy of vacancies) {
          try {
            // Skip if a record for this date already exists (idempotency for restarts/cluster)
            const todayRecord = await strapi.db
              .query('api::vacancy-analytics.vacancy-analytics')
              .findOne({ where: { vacancy: vacancy.id, date } })
            if (todayRecord) continue

            // Use numeric vacancy.id at DB layer for reliable filtering
            const existing = (await strapi.db
              .query('api::vacancy-analytics.vacancy-analytics')
              .findMany({
                where: { vacancy: vacancy.id },
                select: ['views', 'uniqueViews', 'applications'],
              })) as Array<{ views: number; uniqueViews: number; applications: number }>

            const prevViews = existing.reduce((s, r) => s + (r.views ?? 0), 0)
            const prevUnique = existing.reduce((s, r) => s + (r.uniqueViews ?? 0), 0)
            const prevApps = existing.reduce((s, r) => s + (r.applications ?? 0), 0)

            const deltaViews = computeDelta(vacancy.views ?? 0, prevViews)
            const deltaUnique = computeDelta(vacancy.uniqueViews ?? 0, prevUnique)
            const deltaApps = computeDelta(vacancy.applicationsCount ?? 0, prevApps)

            if (deltaViews === 0 && deltaUnique === 0 && deltaApps === 0) continue

            const ctr = deltaUnique > 0 ? Math.round((deltaApps / deltaUnique) * 100 * 10) / 10 : 0

            await strapi.db.query('api::vacancy-analytics.vacancy-analytics').create({
              data: {
                // DB-layer relations require numeric ids ({ documentId } is silently ignored)
                vacancy: vacancy.id,
                date,
                views: deltaViews,
                uniqueViews: deltaUnique,
                applications: deltaApps,
                ctr,
              },
            })
          } catch (e) {
            strapi.log.warn(`[cron] analytics failed for vacancy ${vacancy.documentId}`, e)
          }
        }

        // --- Resume Analytics ---
        const resumes = (await (strapi.documents as any)('api::resume.resume').findMany({
          filters: { moderationStatus: { $in: ['published', 'archived'] } },
          fields: ['documentId', 'views', 'uniqueViews', 'invitations'],
          limit: 10000,
        })) as Array<{
          id: number
          documentId: string
          views: number
          uniqueViews: number
          invitations: number
        }>

        for (const resume of resumes) {
          try {
            // Skip if a record for this date already exists (idempotency for restarts/cluster)
            const todayRecord = await strapi.db
              .query('api::resume-analytics.resume-analytics')
              .findOne({ where: { resume: resume.id, date } })
            if (todayRecord) continue

            // Use numeric resume.id at DB layer for reliable filtering
            const existing = (await strapi.db
              .query('api::resume-analytics.resume-analytics')
              .findMany({
                where: { resume: resume.id },
                select: ['views', 'uniqueViews', 'invitations'],
              })) as Array<{ views: number; uniqueViews: number; invitations: number }>

            const prevViews = existing.reduce((s, r) => s + (r.views ?? 0), 0)
            const prevUnique = existing.reduce((s, r) => s + (r.uniqueViews ?? 0), 0)
            const prevInv = existing.reduce((s, r) => s + (r.invitations ?? 0), 0)

            const deltaViews = computeDelta(resume.views ?? 0, prevViews)
            const deltaUnique = computeDelta(resume.uniqueViews ?? 0, prevUnique)
            const deltaInv = computeDelta(resume.invitations ?? 0, prevInv)

            if (deltaViews === 0 && deltaUnique === 0 && deltaInv === 0) continue

            await strapi.db.query('api::resume-analytics.resume-analytics').create({
              data: {
                // DB-layer relations require numeric ids ({ documentId } is silently ignored)
                resume: resume.id,
                date,
                views: deltaViews,
                uniqueViews: deltaUnique,
                invitations: deltaInv,
              },
            })
          } catch (e) {
            strapi.log.warn(`[cron] analytics failed for resume ${resume.documentId}`, e)
          }
        }

        strapi.log.info(
          `[cron] Analytics done: ${vacancies.length} vacancies, ${resumes.length} resumes`
        )
      } catch (err) {
        strapi.log.error('[cron] Analytics aggregation failed', err)
      }
    },
    options: { rule: '0 1 * * *', tz: 'UTC' },
  },
}
