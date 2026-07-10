import { sendNotification } from '../../../../services/notification.service'
import { logModeration } from '../../../../services/moderation.service'
import { rejectionReasonLabel } from '../../../../services/moderation-utils'
import { notifyAdmins } from '../../../../services/admin-notify'
import type { Core } from '@strapi/strapi'

type ResumeBeforeUpdateEvent = {
  params: {
    data?: Record<string, unknown>
    where?: Record<string, unknown>
  }
  state: Record<string, unknown>
}

type ResumeAfterEvent = {
  result: { documentId?: string; status?: string; title?: string }
  params: { data?: Record<string, unknown> }
  state?: Record<string, unknown>
}

export default {
  async beforeUpdate(event: ResumeBeforeUpdateEvent) {
    const statusSet = event.params.data?.['status']
    if (statusSet !== 'moderation' && statusSet !== 'published' && statusSet !== 'rejected') {
      return
    }
    const where = event.params.where
    if (!where || Object.keys(where).length === 0) return

    // Content Manager saves send the whole document including an unchanged
    // status — remember the previous one so afterUpdate reacts to real
    // transitions only (no duplicate notifications / audit logs)
    const previous = (await (globalThis.strapi.db as any)
      .query('api::resume.resume')
      .findOne({ where, select: ['status'] })) as { status?: string } | null
    event.state['previousStatus'] = previous?.status ?? null
  },

  async afterUpdate(event: ResumeAfterEvent) {
    const s = globalThis.strapi as Core.Strapi

    // Counter updates (views++) on published resumes must not re-trigger this.
    const statusSet = (event.params as any)?.data?.['status']
    if (statusSet !== 'moderation' && statusSet !== 'published' && statusSet !== 'rejected') {
      return
    }
    if (event.state?.['previousStatus'] === statusSet) {
      return
    }

    const documentId = event.result.documentId
    if (!documentId) return

    try {
      const resume = await (s.documents as any)('api::resume.resume').findOne({
        documentId,
        populate: { user: { fields: ['id'] } },
        fields: ['documentId', 'title', 'rejectionReason'],
      })

      if (statusSet === 'moderation') {
        await logModeration(s, {
          entityType: 'resume',
          entityDocumentId: documentId,
          entityTitle: resume?.title ?? '',
          action: 'submitted',
        })
        notifyAdmins(s, {
          entityType: 'resume',
          title: resume?.title ?? '',
          ...(resume?.user?.id ? { authorId: resume.user.id } : {}),
          documentId,
        })
        return
      }

      if (!resume?.user?.id) return

      if (statusSet === 'published') {
        s.log.info(`[resume] Resume ${documentId} published`)
        await sendNotification(s, {
          userId: resume.user.id,
          type: 'moderation_approved',
          templateData: {
            title: resume.title ?? '',
            entityType: 'resume',
            entityId: documentId,
            resumeId: documentId,
          },
        })
      } else {
        await sendNotification(s, {
          userId: resume.user.id,
          type: 'moderation_rejected',
          templateData: {
            title: resume.title ?? '',
            reason: rejectionReasonLabel(resume.rejectionReason),
            entityType: 'resume',
            entityId: documentId,
            resumeId: documentId,
          },
        })
      }
    } catch (err) {
      s.log.error('[resume] Moderation lifecycle failed', err)
    }
  },
}
