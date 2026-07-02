import { sendNotification } from '../../../../services/notification.service'
import type { Core } from '@strapi/strapi'

type ResumeAfterEvent = {
  result: { documentId?: string; status?: string; title?: string }
  params: { data?: Record<string, unknown> }
}

export default {
  async afterUpdate(event: ResumeAfterEvent) {
    const s = globalThis.strapi as Core.Strapi

    // Only react when the update itself sets status=published (moderation approval).
    // Counter updates (views++) on published resumes must not re-trigger this.
    if (event.params.data?.['status'] !== 'published') return

    s.log.info(`[resume] Resume ${event.result.documentId} published`)

    try {
      const resume = await (s.documents as any)('api::resume.resume').findOne({
        documentId: event.result.documentId!,
        populate: { user: { fields: ['id'] } },
        fields: ['documentId', 'title'],
      })

      if (!resume?.user?.id) return

      await sendNotification(s, {
        userId: resume.user.id,
        type: 'moderation_approved',
        templateData: {
          title: resume.title ?? '',
          entityType: 'resume',
          entityId: event.result.documentId ?? '',
          resumeId: event.result.documentId ?? '',
        },
      })
    } catch (err) {
      s.log.error('[resume] Failed to send moderation_approved notification', err)
    }
  },
}
