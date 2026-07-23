import { sendNotification } from '../../../../services/notification.service'
import { APPLICATION_STATUS_TO_NOTIFICATION } from '../../../payment/services/telegram-bot'
import type { Core } from '@strapi/strapi'

type ApplicationAfterEvent = {
  result: {
    id?: number
    documentId?: string
    status?: string
    vacancy?: { id?: number; documentId?: string }
    user?: { id?: number }
  }
  params: { data?: Record<string, unknown> }
  state?: Record<string, unknown>
}

type ApplicationBeforeUpdateEvent = {
  params: {
    data?: Record<string, unknown>
    where?: Record<string, unknown>
  }
  state: Record<string, unknown>
}

// Статусы, при которых контакты работодателя раскрываются кандидату
const CONTACTS_REVEALING_STATUSES = new Set(['interview', 'test-task', 'offer', 'hired'])

export default {
  async beforeUpdate(event: ApplicationBeforeUpdateEvent) {
    const newStatus = event.params.data?.['status'] as string | undefined
    if (!newStatus || !CONTACTS_REVEALING_STATUSES.has(newStatus)) return

    // Capture previous status to detect first entry into contacts-revealing zone
    const where = event.params.where
    if (!where || Object.keys(where).length === 0) return
    const previous = (await (globalThis.strapi.db as any)
      .query('api::application.application')
      .findOne({ where, select: ['status'] })) as { status?: string } | null
    event.state['previousStatus'] = previous?.status ?? null
  },

  async afterCreate(event: ApplicationAfterEvent) {
    const s = globalThis.strapi as Core.Strapi
    s.log.info(`[application] New application ${event.result.documentId} created`)

    try {
      // Fetch with populated relations to get vacancy.postedBy
      const application = await (s.documents as any)('api::application.application').findOne({
        documentId: event.result.documentId!,
        populate: {
          vacancy: { fields: ['documentId', 'title'], populate: { postedBy: { fields: ['id'] } } },
          user: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!application) return

      const employerId = (application.vacancy as any)?.postedBy?.id
      const candidateName =
        [application.user?.firstName, application.user?.lastName].filter(Boolean).join(' ') ||
        'Кандидат'

      if (employerId) {
        await sendNotification(s, {
          userId: employerId,
          type: 'new_application',
          templateData: {
            vacancyTitle: application.vacancy?.title ?? '',
            vacancyId: application.vacancy?.documentId ?? '',
            candidateName,
          },
        })
      }
    } catch (err) {
      s.log.error('[application] Failed to send new_application notification', err)
    }
  },

  async afterUpdate(event: ApplicationAfterEvent) {
    const s = globalThis.strapi as Core.Strapi
    // Only react when the update itself changes the status
    const newStatus = event.params.data?.['status'] as string | undefined
    if (!newStatus) return

    s.log.info(`[application] Application ${event.result.documentId} status → ${newStatus}`)

    const notificationType = APPLICATION_STATUS_TO_NOTIFICATION[newStatus ?? '']
    if (!notificationType) return

    try {
      const application = await (s.documents as any)('api::application.application').findOne({
        documentId: event.result.documentId!,
        populate: {
          vacancy: { fields: ['documentId', 'title'] },
          user: { fields: ['id'] },
        },
      })

      if (!application?.user?.id) return

      const templateData = {
        vacancyTitle: application.vacancy?.title ?? '',
        applicationId: event.result.documentId ?? '',
      }

      // Раскрываем контакты работодателя при ПЕРВОМ входе в revealing-зону.
      // Если предыдущий статус уже был revealing (например interview→offer),
      // кандидат уже видит контакты — повторное уведомление не нужно.
      const previousStatus = event.state?.['previousStatus'] as string | undefined
      const isFirstReveal =
        CONTACTS_REVEALING_STATUSES.has(newStatus) &&
        !CONTACTS_REVEALING_STATUSES.has(previousStatus ?? '')
      if (isFirstReveal) {
        await sendNotification(s, {
          userId: application.user.id,
          type: 'application_approved',
          templateData,
        })
      }

      await sendNotification(s, {
        userId: application.user.id,
        type: notificationType,
        templateData,
      })
    } catch (err) {
      s.log.error('[application] Failed to send status-change notification', err)
    }
  },
}
