import { sendNotification } from '../../../../services/notification.service'
import { logModeration } from '../../../../services/moderation.service'
import { rejectionReasonLabel } from '../../../../services/moderation-utils'
import type { Core } from '@strapi/strapi'

type CompanyBeforeUpdateEvent = {
  params: {
    data?: Record<string, unknown>
    where?: Record<string, unknown>
  }
  state: Record<string, unknown>
}

type CompanyLifecycleEvent = {
  result: {
    status?: string
    documentId?: string
    name?: string
  }
  params: { data?: Record<string, unknown> }
  state?: Record<string, unknown>
}

export default {
  async beforeUpdate(event: CompanyBeforeUpdateEvent) {
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
      .query('api::company.company')
      .findOne({ where, select: ['status'] })) as { status?: string } | null
    event.state['previousStatus'] = previous?.status ?? null
  },

  async afterUpdate(event: CompanyLifecycleEvent) {
    const statusSet = (event.params as any)?.data?.['status']
    if (statusSet !== 'moderation' && statusSet !== 'published' && statusSet !== 'rejected') {
      return
    }
    if (event.state?.['previousStatus'] === statusSet) {
      return
    }

    const s = globalThis.strapi as Core.Strapi
    const documentId = event.result.documentId
    if (!documentId) return

    try {
      const company = await (s.documents as any)('api::company.company').findOne({
        documentId,
        populate: { owner: { fields: ['id'] } },
        fields: ['documentId', 'name', 'rejectionReason'],
      })

      if (statusSet === 'moderation') {
        await logModeration(s, {
          entityType: 'company',
          entityDocumentId: documentId,
          entityTitle: company?.name ?? '',
          action: 'submitted',
        })
        return
      }

      if (!company?.owner?.id) return

      if (statusSet === 'published') {
        s.log.info(`[company] Company ${documentId} published`)
        await sendNotification(s, {
          userId: company.owner.id,
          type: 'moderation_approved',
          templateData: {
            title: company.name ?? '',
            entityType: 'company',
            entityId: documentId,
          },
        })
      } else {
        await sendNotification(s, {
          userId: company.owner.id,
          type: 'moderation_rejected',
          templateData: {
            title: company.name ?? '',
            reason: rejectionReasonLabel(company.rejectionReason),
            entityType: 'company',
            entityId: documentId,
          },
        })
      }
    } catch (err) {
      s.log.error('[company] Moderation lifecycle failed', err)
    }
  },
}
