import type { Core } from '@strapi/strapi'

import { toSlug, canSubmit, canDelete } from '../services/company-utils'
import { getBlockedUserIds } from '../../block/services/block-filter'
import { resolveOptionalUserId } from '../../../utils/optional-auth'
import type companyServiceFactory from '../services/company'

type CompanyService = ReturnType<typeof companyServiceFactory>

const VALID_COMPANY_SIZES = [
  'size_1_10',
  'size_11_50',
  'size_51_200',
  'size_201_500',
  'size_500_plus',
] as const

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::company.company') as unknown as CompanyService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const body = ctx.request.body as Record<string, unknown>

      const { name, description, country, companySize } = body
      if (!name || !description || !country || !companySize) {
        return ctx.badRequest('name, description, country and companySize are required')
      }

      if (!VALID_COMPANY_SIZES.includes(companySize as (typeof VALID_COMPANY_SIZES)[number])) {
        return ctx.badRequest(`companySize must be one of: ${VALID_COMPANY_SIZES.join(', ')}`)
      }

      const company = await svc().createCompany(user.id, {
        name: name as string,
        description: description as string,
        country: country as string,
        companySize: companySize as string,
        city: body.city as string | undefined,
        website: body.website as string | undefined,
        telegram: body.telegram as string | undefined,
        linkedin: body.linkedin as string | undefined,
      })

      return ctx.send({ data: company }, 201)
    },

    async submit(ctx: any) {
      const { id } = ctx.params as { id: string }

      // Ownership already verified by is-company-owner policy
      const company = await strapi.documents('api::company.company').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })

      if (!company) return ctx.notFound('Company not found')

      const status = (company as any).moderationStatus as string | null | undefined
      if (!status || !canSubmit(status)) {
        return ctx.badRequest(
          `Cannot submit company with status "${status}". Must be "draft" or "rejected".`
        )
      }

      const updated = await strapi.documents('api::company.company').update({
        documentId: id,
        data: { moderationStatus: 'moderation' } as any,
        fields: [
          'documentId',
          'name',
          'slug',
          'country',
          'city',
          'companySize',
          'moderationStatus',
          'createdAt',
          'rejectionReason',
          'rejectionComment',
        ] as any,
        populate: { logo: true },
      })

      return ctx.send({ data: updated })
    },

    async findPublished(ctx: any) {
      const {
        search,
        country,
        city,
        companySize,
        page = '1',
        pageSize = '20',
      } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

      if (
        companySize &&
        !VALID_COMPANY_SIZES.includes(companySize as (typeof VALID_COMPANY_SIZES)[number])
      ) {
        return ctx.badRequest(`companySize must be one of: ${VALID_COMPANY_SIZES.join(', ')}`)
      }

      // Block filter: hide companies owned by blocked users
      let blockedUserIds: number[] = []
      const viewerId = await resolveOptionalUserId(strapi, ctx)
      if (viewerId) {
        blockedUserIds = await getBlockedUserIds(strapi, viewerId)
      }

      const filters: Record<string, unknown> = { moderationStatus: { $eq: 'published' } }

      if (search) {
        filters.$or = [{ name: { $containsi: search } }, { description: { $containsi: search } }]
      }
      if (country) filters.country = { $eq: country }
      if (city) filters.city = { $containsi: city }
      if (companySize) filters.companySize = { $eq: companySize }
      if (blockedUserIds.length > 0) {
        filters.owner = { id: { $notIn: blockedUserIds } }
      }

      const [companies, total] = await Promise.all([
        strapi.documents('api::company.company').findMany({
          filters,
          fields: [
            'documentId',
            'name',
            'slug',
            'country',
            'city',
            'companySize',
            'moderationStatus',
            'createdAt',
          ],
          populate: { logo: true },
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        strapi.documents('api::company.company').count({ filters }),
      ])

      return ctx.send({
        data: companies,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },

    async findOne(ctx: any) {
      const { id } = ctx.params as { id: string }

      const company = await strapi.documents('api::company.company').findFirst({
        filters: { documentId: { $eq: id }, moderationStatus: { $eq: 'published' } },
        fields: [
          'documentId',
          'name',
          'slug',
          'description',
          'website',
          'telegram',
          'linkedin',
          'country',
          'city',
          'companySize',
          'moderationStatus',
          'createdAt',
        ],
        populate: {
          logo: true,
          cover: true,
          owner: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!company) return ctx.notFound('Company not found')

      return ctx.send({ data: company })
    },

    async findBySlug(ctx: any) {
      const { slug } = ctx.params as { slug: string }

      const company = await strapi.documents('api::company.company').findFirst({
        filters: {
          slug: { $eq: slug },
          moderationStatus: { $eq: 'published' },
        },
        fields: [
          'documentId',
          'name',
          'slug',
          'description',
          'website',
          'telegram',
          'linkedin',
          'country',
          'city',
          'companySize',
          'moderationStatus',
          'createdAt',
        ],
        populate: {
          logo: true,
          cover: true,
          owner: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!company) return ctx.notFound('Company not found')

      return ctx.send({ data: company })
    },

    async update(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }
      const body = ctx.request.body as Record<string, unknown>

      const existing = await strapi.documents('api::company.company').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus', 'name', 'slug'],
      })
      if (!existing) return ctx.notFound('Company not found')

      const existingStatus = (existing as any).moderationStatus as string
      if (existingStatus === 'moderation') {
        return ctx.badRequest('Cannot edit company while it is under moderation.')
      }

      const updateData: Record<string, unknown> = {}
      const allowedFields = [
        'name',
        'description',
        'country',
        'city',
        'companySize',
        'website',
        'telegram',
        'linkedin',
      ]
      for (const field of allowedFields) {
        if (field in body) updateData[field] = body[field]
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No updatable fields provided.')
      }

      if (
        'name' in updateData &&
        (typeof updateData.name !== 'string' || !updateData.name.trim())
      ) {
        return ctx.badRequest('name must be a non-empty string')
      }

      if (updateData.companySize !== undefined) {
        if (
          !VALID_COMPANY_SIZES.includes(
            updateData.companySize as (typeof VALID_COMPANY_SIZES)[number]
          )
        ) {
          return ctx.badRequest(`companySize must be one of: ${VALID_COMPANY_SIZES.join(', ')}`)
        }
      }

      if (updateData.name !== undefined && updateData.name !== existing.name) {
        const baseSlug = toSlug(updateData.name as string)
        updateData.slug = await svc().generateUniqueSlug(baseSlug, id)
      }

      updateData.moderationStatus = 'moderation'

      const updated = await strapi.documents('api::company.company').update({
        documentId: id,
        data: updateData as any,
        fields: [
          'documentId',
          'name',
          'slug',
          'description',
          'website',
          'telegram',
          'linkedin',
          'country',
          'city',
          'companySize',
          'moderationStatus',
          'createdAt',
        ],
      })

      return ctx.send({ data: updated })
    },

    async delete(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const company = await strapi.documents('api::company.company').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })
      if (!company) return ctx.notFound('Company not found')

      const status = (company as any).moderationStatus as string
      if (status !== 'draft' && status !== 'rejected') {
        return ctx.badRequest(
          `Cannot delete company with status "${status}". Must be draft or rejected.`
        )
      }

      const activeVacancies = await strapi.documents('api::vacancy.vacancy').count({
        filters: {
          company: { documentId: { $eq: id } },
          moderationStatus: { $in: ['published', 'moderation'] },
        },
      })
      if (!canDelete(activeVacancies)) {
        return ctx.badRequest(`Cannot delete company with active vacancies.`)
      }

      await strapi.documents('api::company.company').delete({ documentId: id })

      ctx.status = 204
      ctx.body = null
    },

    async findMineById(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const company = await strapi.documents('api::company.company').findFirst({
        filters: {
          documentId: { $eq: id },
          owner: { id: { $eq: user.id } },
        },
        fields: [
          'documentId',
          'name',
          'slug',
          'description',
          'website',
          'telegram',
          'linkedin',
          'country',
          'city',
          'companySize',
          'moderationStatus',
          'createdAt',
          'rejectionReason',
          'rejectionComment',
        ] as any,
        populate: {
          logo: true,
          cover: true,
          owner: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!company) return ctx.notFound('Company not found')

      return ctx.send({ data: company })
    },

    async findMine(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { page = '1', pageSize = '20' } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

      const filters: Record<string, unknown> = {
        owner: { id: { $eq: user.id } },
      }

      const [companies, total] = await Promise.all([
        strapi.documents('api::company.company').findMany({
          filters,
          fields: [
            'documentId',
            'name',
            'slug',
            'country',
            'city',
            'companySize',
            'moderationStatus',
            'createdAt',
            'rejectionReason',
            'rejectionComment',
          ] as any,
          populate: { logo: true },
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        strapi.documents('api::company.company').count({ filters }),
      ])

      return ctx.send({
        data: companies,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },
  }
}
