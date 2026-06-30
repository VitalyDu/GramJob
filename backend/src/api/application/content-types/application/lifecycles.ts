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
  params: unknown
}

export default {
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
    const newStatus = event.result.status

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

      await sendNotification(s, {
        userId: application.user.id,
        type: notificationType,
        templateData: {
          vacancyTitle: application.vacancy?.title ?? '',
          applicationId: event.result.documentId ?? '',
        },
      })
    } catch (err) {
      s.log.error('[application] Failed to send status-change notification', err)
    }
  },
}
