import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { isRead, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
    if (isRead === 'true') filters['isRead'] = { $eq: true }
    if (isRead === 'false') filters['isRead'] = { $eq: false }

    const [notifications, total] = await Promise.all([
      (strapi.documents as any)('api::notification.notification').findMany({
        filters,
        fields: ['documentId', 'type', 'title', 'body', 'isRead', 'data', 'createdAt'],
        sort: 'createdAt:desc',
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
      }),
      (strapi.documents as any)('api::notification.notification').count({ filters }),
    ])

    ctx.send({
      data: notifications,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async markRead(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }

    const notification = await (strapi.documents as any)('api::notification.notification').findOne({
      documentId: id,
      populate: { user: { fields: ['id'] } },
    })

    if (!notification) return ctx.notFound('Notification not found')
    if (notification.user?.id !== user.id) return ctx.forbidden('Not your notification')

    const updated = await (strapi.documents as any)('api::notification.notification').update({
      documentId: id,
      data: { isRead: true },
      fields: ['documentId', 'isRead'],
    })

    ctx.send({ data: updated })
  },

  async markAllRead(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    await strapi.db.query('api::notification.notification').updateMany({
      where: { user: { id: user.id }, isRead: false },
      data: { isRead: true },
    })

    ctx.send({ ok: true })
  },
})
