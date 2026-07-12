import type { Core } from '@strapi/strapi'
import { isValidTargetType } from '../services/block-utils'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { page = '1', pageSize = '20' } = ctx.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters = { user: { id: { $eq: user.id } } }

    const [blockList, total] = await Promise.all([
      (strapi.documents as any)('api::block.block').findMany({
        filters,
        fields: ['documentId', 'targetType', 'targetId', 'targetName', 'createdAt'],
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::block.block').count({ filters }),
    ])

    return ctx.send({
      data: blockList,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { targetType, targetId, targetName } = body

    if (!targetType || !targetId) return ctx.badRequest('targetType and targetId are required')
    if (!isValidTargetType(targetType as string)) {
      return ctx.badRequest('targetType must be one of: employer, candidate, company')
    }
    if (typeof targetId !== 'number' && typeof targetId !== 'string') {
      return ctx.badRequest('targetId must be a number')
    }
    const targetIdNum = typeof targetId === 'string' ? parseInt(targetId, 10) : targetId
    if (isNaN(targetIdNum)) return ctx.badRequest('targetId must be a valid number')

    // Prevent self-block for user-type targets
    if (targetType !== 'company' && targetIdNum === user.id) {
      return ctx.badRequest('Cannot block yourself')
    }

    // Enforce uniqueness: (user, targetType, targetId)
    const existing = await (strapi.documents as any)('api::block.block').findFirst({
      filters: {
        user: { id: { $eq: user.id } },
        targetType: { $eq: targetType as string },
        targetId: { $eq: targetIdNum },
      },
    })
    if (existing) {
      return ctx.send(
        {
          error: { code: 'ALREADY_BLOCKED', message: 'This entity is already blocked' },
        },
        409
      )
    }

    const nameToStore = typeof targetName === 'string' ? targetName.trim() : ''

    const block = await (strapi.documents as any)('api::block.block').create({
      data: {
        user: user.id,
        targetType: targetType as string,
        targetId: targetIdNum,
        targetName: nameToStore,
      },
      fields: ['documentId', 'targetType', 'targetId', 'targetName', 'createdAt'],
    })

    return ctx.send({ data: block }, 201)
  },

  async remove(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }

    const block = await (strapi.documents as any)('api::block.block').findFirst({
      filters: { documentId: { $eq: id }, user: { id: { $eq: user.id } } },
    })
    if (!block) return ctx.notFound('Block not found')

    await (strapi.documents as any)('api::block.block').delete({ documentId: id })

    return ctx.send(null, 204)
  },
})
