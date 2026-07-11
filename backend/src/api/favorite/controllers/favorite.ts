import type { Core } from '@strapi/strapi'
import { isValidFavoriteType, type FavoriteType } from '../services/favorite-utils'

const VACANCY_CARD_POPULATE = {
  industry: { fields: ['documentId', 'slug', 'name'] },
  specialization: { fields: ['documentId', 'slug', 'name'] },
  company: { fields: ['documentId', 'name', 'slug'], populate: { logo: true } },
  postedBy: { fields: ['id', 'firstName', 'lastName'] },
} as const

const VACANCY_CARD_FIELDS = [
  'documentId',
  'title',
  'country',
  'city',
  'workFormat',
  'employmentType',
  'seniority',
  'salaryFrom',
  'salaryTo',
  'salaryCurrency',
  'urgent',
  'topPlacement',
  'highlighted',
  'sourceType',
  'moderationStatus',
  'expiresAt',
  'createdAt',
] as const

const RESUME_CARD_FIELDS = [
  'documentId',
  'title',
  'firstName',
  'lastName',
  'country',
  'city',
  'desiredSalary',
  'currency',
  'workFormat',
  'employmentType',
  'experienceYears',
  'skills',
  'languages',
  'views',
  'moderationStatus',
  'createdAt',
] as const

const COMPANY_CARD_FIELDS = [
  'documentId',
  'name',
  'slug',
  'country',
  'city',
  'companySize',
  'moderationStatus',
  'createdAt',
] as const

async function populateEntity(strapi: Core.Strapi, type: FavoriteType, targetId: string) {
  if (type === 'vacancy') {
    return (strapi.documents as any)('api::vacancy.vacancy').findFirst({
      filters: { documentId: { $eq: targetId }, moderationStatus: { $eq: 'published' } },
      fields: VACANCY_CARD_FIELDS as any,
      populate: VACANCY_CARD_POPULATE as any,
    })
  }
  if (type === 'resume') {
    return (strapi.documents as any)('api::resume.resume').findFirst({
      filters: { documentId: { $eq: targetId }, moderationStatus: { $eq: 'published' } },
      fields: RESUME_CARD_FIELDS as any,
      populate: { user: { fields: ['id', 'firstName', 'lastName'] } },
    })
  }
  if (type === 'company') {
    return (strapi.documents as any)('api::company.company').findFirst({
      filters: { documentId: { $eq: targetId }, moderationStatus: { $eq: 'published' } },
      fields: COMPANY_CARD_FIELDS as any,
      populate: { logo: true },
    })
  }
  return null
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { type, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    if (type && !isValidFavoriteType(type)) {
      return ctx.badRequest('type must be one of: vacancy, resume, company')
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
    if (type) filters.type = { $eq: type }

    const [favorites, total] = await Promise.all([
      (strapi.documents as any)('api::favorite.favorite').findMany({
        filters,
        fields: ['documentId', 'type', 'targetId', 'createdAt'],
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::favorite.favorite').count({ filters }),
    ])

    const enriched = await Promise.all(
      favorites.map(async (fav: any) => {
        const entity = await populateEntity(strapi, fav.type, fav.targetId)
        return { ...fav, entity }
      })
    )

    return ctx.send({
      data: enriched,
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
    const { type, targetId } = body

    if (!type || !targetId) return ctx.badRequest('type and targetId are required')
    if (!isValidFavoriteType(type as string)) {
      return ctx.badRequest('type must be one of: vacancy, resume, company')
    }

    // Enforce uniqueness: (user, type, targetId)
    const existing = await (strapi.documents as any)('api::favorite.favorite').findFirst({
      filters: {
        user: { id: { $eq: user.id } },
        type: { $eq: type as string },
        targetId: { $eq: targetId as string },
      },
    })
    if (existing) {
      return ctx.send(
        {
          error: { code: 'ALREADY_FAVORITED', message: 'Already in favorites' },
        },
        409
      )
    }

    const favorite = await (strapi.documents as any)('api::favorite.favorite').create({
      data: {
        user: user.id,
        type: type as string,
        targetId: targetId as string,
      },
      fields: ['documentId', 'type', 'targetId', 'createdAt'],
    })

    return ctx.send({ data: favorite }, 201)
  },

  async remove(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { targetType, targetId } = ctx.params as { targetType: string; targetId: string }

    if (!isValidFavoriteType(targetType)) {
      return ctx.badRequest('targetType must be one of: vacancy, resume, company')
    }

    const favorite = await (strapi.documents as any)('api::favorite.favorite').findFirst({
      filters: {
        user: { id: { $eq: user.id } },
        type: { $eq: targetType },
        targetId: { $eq: targetId },
      },
    })
    if (!favorite) return ctx.notFound('Favorite not found')

    await (strapi.documents as any)('api::favorite.favorite').delete({
      documentId: favorite.documentId,
    })

    return ctx.send(null, 204)
  },
})
