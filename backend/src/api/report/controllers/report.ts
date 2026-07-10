import type { Core } from '@strapi/strapi'
import { isValidReportType, isValidReportReason } from '../services/report-utils'
import { notifyAdmins } from '../../../services/admin-notify'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { type, targetId, reason } = body

    if (!type || !targetId || !reason) {
      return ctx.badRequest('type, targetId and reason are required')
    }
    if (!isValidReportType(type as string)) {
      return ctx.badRequest('type must be one of: vacancy, resume, company, user')
    }
    if (!isValidReportReason(reason as string)) {
      return ctx.badRequest('reason must be one of: spam, fraud, inappropriate, other')
    }

    const report = await (strapi.documents as any)('api::report.report').create({
      data: {
        reporter: user.id,
        type: type as string,
        targetId: String(targetId),
        reason: reason as string,
        comment: (body.comment as string | undefined) ?? null,
        status: 'pending',
      },
      fields: ['documentId', 'type', 'targetId', 'reason', 'comment', 'status', 'createdAt'],
    })

    notifyAdmins(strapi, {
      entityType: 'report',
      title: `${type} #${targetId}: ${reason}`,
      authorId: user.id,
      documentId: report.documentId,
    })

    return ctx.send({ data: report }, 201)
  },
})
