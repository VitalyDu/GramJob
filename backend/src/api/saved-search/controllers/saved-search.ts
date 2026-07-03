import type { Core } from '@strapi/strapi'
import { isValidSavedSearchType } from '../services/saved-search-utils'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { page = '1', pageSize = '20' } = ctx.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters = { user: { id: { $eq: user.id } } }

    const [searches, total] = await Promise.all([
      (strapi.documents as any)('api::saved-search.saved-search').findMany({
        filters,
        fields: ['documentId', 'name', 'type', 'filters', 'lastNotifiedAt', 'createdAt'],
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::saved-search.saved-search').count({ filters }),
    ])

    return ctx.send({
      data: searches,
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
    const { type, filters: savedFilters } = body

    if (!type) return ctx.badRequest('type is required')
    if (!isValidSavedSearchType(type as string)) {
      return ctx.badRequest('type must be one of: vacancy, resume')
    }
    if (!savedFilters || typeof savedFilters !== 'object' || Array.isArray(savedFilters)) {
      return ctx.badRequest('filters is required and must be an object')
    }

    const search = await (strapi.documents as any)('api::saved-search.saved-search').create({
      data: {
        user: user.id,
        name: (body.name as string | undefined) ?? null,
        type: type as string,
        filters: savedFilters,
      },
      fields: ['documentId', 'name', 'type', 'filters', 'lastNotifiedAt', 'createdAt'],
    })

    return ctx.send({ data: search }, 201)
  },

  async remove(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }

    const search = await (strapi.documents as any)('api::saved-search.saved-search').findFirst({
      filters: { documentId: { $eq: id }, user: { id: { $eq: user.id } } },
    })
    if (!search) return ctx.notFound('Saved search not found')

    await (strapi.documents as any)('api::saved-search.saved-search').delete({
      documentId: id,
    })

    return ctx.send(null, 204)
  },
})
