import { sendNotification } from '../../../../services/notification.service'
import { logModeration } from '../../../../services/moderation.service'
import { rejectionReasonLabel } from '../../../../services/moderation-utils'
import type { Core } from '@strapi/strapi'

type VacancyBeforeCreateEvent = {
  params: {
    data: Record<string, unknown>
  }
}

type VacancyBeforeUpdateEvent = {
  params: {
    data: Record<string, unknown>
    documentId?: string
    where?: Record<string, unknown>
  }
}

type VacancyAfterEvent = {
  result: { documentId?: string; id?: number; status?: string; expiresAt?: string | null }
  params: { data?: Record<string, unknown> }
}

function sanitizeJsonFields(data: Record<string, unknown>) {
  for (const field of ['skills', 'languages']) {
    if (data[field] === '' || data[field] === undefined) {
      data[field] = null
    }
  }
}

export default {
  async beforeCreate(event: VacancyBeforeCreateEvent) {
    const { data } = event.params
    sanitizeJsonFields(data)

    // boostedAt starts equal to creation time so that boostedAt:desc ordering
    // matches createdAt:desc for never-boosted vacancies (no NULLs in sort)
    if (!data.boostedAt) {
      data.boostedAt = new Date().toISOString()
    }

    const posterId = typeof data.postedBy === 'number' ? data.postedBy : null
    if (!posterId) return

    const poster = await (globalThis.strapi.db as any)
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: posterId }, select: ['subscriptionPlan'] })

    if (poster?.subscriptionPlan === 'vip') {
      data.highlighted = true
    }
  },

  async beforeUpdate(event: VacancyBeforeUpdateEvent) {
    const { data } = event.params
    sanitizeJsonFields(data)

    if (data?.status === 'published') {
      const expiresAt = new Date()
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 60)
      data.expiresAt = expiresAt.toISOString()
    }
  },

  async afterCreate(event: VacancyAfterEvent) {
    // No await: raw SQL runs after Strapi commits the transaction to avoid lock deadlock
    updateSearchVector(event.result.id)
  },

  async afterUpdate(event: VacancyAfterEvent) {
    // No await: raw SQL runs after Strapi commits the transaction to avoid lock deadlock
    updateSearchVector(event.result.id)

    const statusSet = (event.params as any)?.data?.['status']
    if (statusSet !== 'moderation' && statusSet !== 'published' && statusSet !== 'rejected') {
      return
    }

    const s = globalThis.strapi as Core.Strapi
    const documentId = event.result.documentId
    if (!documentId) return

    try {
      const vacancy = await (s.documents as any)('api::vacancy.vacancy').findOne({
        documentId,
        populate: { postedBy: { fields: ['id'] } },
        fields: ['documentId', 'title', 'rejectionReason'],
      })

      if (statusSet === 'moderation') {
        await logModeration(s, {
          entityType: 'vacancy',
          entityDocumentId: documentId,
          entityTitle: vacancy?.title ?? '',
          action: 'submitted',
        })
        return
      }

      if (!vacancy?.postedBy?.id) return

      if (statusSet === 'published') {
        s.log.info(`[vacancy] Vacancy ${documentId} published`)
        await sendNotification(s, {
          userId: vacancy.postedBy.id,
          type: 'moderation_approved',
          templateData: {
            title: vacancy.title ?? '',
            entityType: 'vacancy',
            entityId: documentId,
          },
        })
      } else {
        await sendNotification(s, {
          userId: vacancy.postedBy.id,
          type: 'moderation_rejected',
          templateData: {
            title: vacancy.title ?? '',
            reason: rejectionReasonLabel(vacancy.rejectionReason),
            entityType: 'vacancy',
            entityId: documentId,
          },
        })
      }
    } catch (err) {
      s.log.error('[vacancy] Moderation lifecycle failed', err)
    }
  },
}

const SEARCH_VECTOR_MAX_ATTEMPTS = 5

async function updateSearchVector(vacancyId: number | undefined, attempt = 1) {
  if (!vacancyId) return
  const s = globalThis.strapi
  try {
    const result = (await s.db.connection.raw(
      `UPDATE vacancies
       SET search_vector =
         setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
         setweight(to_tsvector('russian', coalesce(description, '')), 'B') ||
         setweight(to_tsvector('russian', coalesce(responsibilities, '')), 'C') ||
         setweight(to_tsvector('russian', coalesce(requirements, '')), 'C')
       WHERE id = ?`,
      [vacancyId]
    )) as { rowCount?: number }

    // afterCreate fires before the wrapping transaction commits, so this separate
    // connection may not see the new row yet (0 rows updated) — retry with backoff
    if ((result.rowCount ?? 0) === 0) {
      if (attempt >= SEARCH_VECTOR_MAX_ATTEMPTS) {
        s.log.warn(`[vacancy] search_vector not updated for id=${vacancyId}: row not visible`)
        return
      }
      setTimeout(() => void updateSearchVector(vacancyId, attempt + 1), 200 * attempt)
    }
  } catch {
    s.log.warn(`[vacancy] Failed to update search_vector for id=${vacancyId}`)
  }
}
