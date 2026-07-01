import { sendNotification } from '../../../../services/notification.service'
import type { Core } from '@strapi/strapi'

type CompanyLifecycleEvent = {
  result: {
    status?: string
    documentId?: string
    name?: string
  }
  params: unknown
}

export default {
  async afterUpdate(event: CompanyLifecycleEvent) {
    if (event.result.status !== 'published') return

    const s = globalThis.strapi as Core.Strapi
    s.log.info(`[company] Company ${event.result.documentId} published`)

    try {
      const company = await (s.documents as any)('api::company.company').findOne({
        documentId: event.result.documentId!,
        populate: { owner: { fields: ['id'] } },
        fields: ['documentId', 'name'],
      })

      if (!company?.owner?.id) return

      await sendNotification(s, {
        userId: company.owner.id,
        type: 'moderation_approved',
        templateData: {
          title: company.name ?? '',
          entityType: 'company',
          entityId: event.result.documentId ?? '',
        },
      })
    } catch (err) {
      s.log.error('[company] Failed to send moderation_approved notification', err)
    }
  },
}
