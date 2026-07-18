import type { Core } from '@strapi/strapi'

import { toSlug, canSubmit, canDelete } from '../services/company-utils'
import { getBlockedIds } from '../../block/services/block-filter'
import { resolveOptionalUserId } from '../../../utils/optional-auth'
import {
  validateShortText,
  validateLongText,
  validateHttpUrl,
} from '../../../utils/input-validation'
import type companyServiceFactory from '../services/company'

// IP-tracker для company.uniqueViews (аналогично vacancy/resume)
const viewedCompanyIPs = new Map<string, Set<string>>()

function isUniqueCompanyView(documentId: string, ip: string): boolean {
  return !(viewedCompanyIPs.get(documentId)?.has(ip) ?? false)
}

function recordCompanyView(documentId: string, ip: string): void {
  if (!viewedCompanyIPs.has(documentId)) viewedCompanyIPs.set(documentId, new Set())
  viewedCompanyIPs.get(documentId)!.add(ip)
}

async function bumpCompanyViews(
  strapi: Core.Strapi,
  documentId: string,
  ownerId: number | undefined,
  viewerId: number | undefined,
  ip: string,
  currentViews: number,
  currentUniqueViews: number
): Promise<{ views: number; uniqueViews: number }> {
  // Не считаем просмотры владельца компании
  if (viewerId && viewerId === ownerId) {
    return { views: currentViews, uniqueViews: currentUniqueViews }
  }
  const unique = isUniqueCompanyView(documentId, ip)
  recordCompanyView(documentId, ip)
  const newViews = currentViews + 1
  const newUnique = unique ? currentUniqueViews + 1 : currentUniqueViews
  await strapi.documents('api::company.company').update({
    documentId,
    data: { views: newViews, uniqueViews: newUnique } as any,
  })
  return { views: newViews, uniqueViews: newUnique }
}

type CompanyService = ReturnType<typeof companyServiceFactory>

const VALID_COMPANY_SIZES = [
  'size_1_10',
  'size_11_50',
  'size_51_200',
  'size_201_500',
  'size_500_plus',
] as const

const COMPANY_VACANCY_CARD_FIELDS = [
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
  'createdAt',
] as const

async function fetchCompanyRecentVacancies(strapi: Core.Strapi, companyDocumentId: string) {
  return strapi.documents('api::vacancy.vacancy').findMany({
    filters: {
      company: { documentId: { $eq: companyDocumentId } },
      moderationStatus: { $eq: 'published' },
      expiresAt: { $gt: new Date().toISOString() },
    },
    fields: COMPANY_VACANCY_CARD_FIELDS as any,
    populate: {
      industry: { fields: ['documentId', 'slug', 'name'] },
      specialization: { fields: ['documentId', 'slug', 'name'] },
    },
    sort: 'createdAt:desc' as any,
    limit: 5,
  })
}

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

      for (const [field, val] of [
        ['name', name],
        ['country', country],
        ['city', body.city],
        ['telegram', body.telegram],
      ] as const) {
        if (val !== undefined && val !== null && val !== '') {
          const err = validateShortText(field, val)
          if (err) return ctx.badRequest(err)
        }
      }
      const descErr = validateLongText('description', description)
      if (descErr) return ctx.badRequest(descErr)
      for (const field of ['website', 'linkedin'] as const) {
        const err = validateHttpUrl(field, body[field])
        if (err) return ctx.badRequest(err)
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
        logo: body.logo as number | undefined,
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

      // Block filter: hide companies owned by blocked users or directly blocked companies
      let blockedUserIds: number[] = []
      let blockedCompanyIds: number[] = []
      const viewerId = await resolveOptionalUserId(strapi, ctx)
      if (viewerId) {
        const blocked = await getBlockedIds(strapi, viewerId)
        blockedUserIds = blocked.userIds
        blockedCompanyIds = blocked.companyIds
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
      if (blockedCompanyIds.length > 0) {
        filters.id = { $notIn: blockedCompanyIds }
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
      const ip = ctx.request.ip ?? 'unknown'
      const viewer = ctx.state.user as { id: number } | undefined

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
          // views/uniqueViews добавлены в schema.json, но contentTypes.d.ts обновится
          // при следующем dev-старте Strapi. as any до тех пор.
          'views',
          'uniqueViews',
          'createdAt',
        ] as any,
        populate: {
          logo: true,
          cover: true,
          owner: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!company) return ctx.notFound('Company not found')

      // Block-фильтр: viewer заблокировал компанию или её владельца → 404.
      if (viewer && viewer.id !== (company as any).owner?.id) {
        const { userIds, companyIds } = await getBlockedIds(strapi, viewer.id)
        const ownerId = (company as any).owner?.id as number | undefined
        const numericCompanyId = (company as any).id as number | undefined
        if (
          (ownerId && userIds.includes(ownerId)) ||
          (numericCompanyId && companyIds.includes(numericCompanyId))
        ) {
          return ctx.notFound('Company not found')
        }
      }

      const skipViewCount =
        (ctx.query as Record<string, string> | undefined)?.skipViewCount === 'true'
      const counters = skipViewCount
        ? { views: (company as any).views ?? 0, uniqueViews: (company as any).uniqueViews ?? 0 }
        : await bumpCompanyViews(
            strapi,
            id,
            (company as any).owner?.id,
            viewer?.id,
            ip,
            (company as any).views ?? 0,
            (company as any).uniqueViews ?? 0
          )

      const vacancies = await fetchCompanyRecentVacancies(strapi, id)

      return ctx.send({ data: { ...company, ...counters, vacancies } })
    },

    async findBySlug(ctx: any) {
      const { slug } = ctx.params as { slug: string }
      const ip = ctx.request.ip ?? 'unknown'
      const viewer = ctx.state.user as { id: number } | undefined

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
          'views',
          'uniqueViews',
          'createdAt',
        ] as any,
        populate: {
          logo: true,
          cover: true,
          owner: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!company) return ctx.notFound('Company not found')

      // Block-фильтр (см. findOne)
      if (viewer && viewer.id !== (company as any).owner?.id) {
        const { userIds, companyIds } = await getBlockedIds(strapi, viewer.id)
        const ownerId = (company as any).owner?.id as number | undefined
        const numericCompanyId = (company as any).id as number | undefined
        if (
          (ownerId && userIds.includes(ownerId)) ||
          (numericCompanyId && companyIds.includes(numericCompanyId))
        ) {
          return ctx.notFound('Company not found')
        }
      }

      const skipViewCount =
        (ctx.query as Record<string, string> | undefined)?.skipViewCount === 'true'
      const counters = skipViewCount
        ? { views: (company as any).views ?? 0, uniqueViews: (company as any).uniqueViews ?? 0 }
        : await bumpCompanyViews(
            strapi,
            (company as any).documentId,
            (company as any).owner?.id,
            viewer?.id,
            ip,
            (company as any).views ?? 0,
            (company as any).uniqueViews ?? 0
          )

      const vacancies = await fetchCompanyRecentVacancies(strapi, (company as any).documentId)

      return ctx.send({ data: { ...company, ...counters, vacancies } })
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

      for (const field of ['name', 'country', 'city', 'telegram'] as const) {
        if (field in updateData) {
          const err = validateShortText(field, updateData[field])
          if (err) return ctx.badRequest(err)
        }
      }
      if ('description' in updateData) {
        const err = validateLongText('description', updateData.description)
        if (err) return ctx.badRequest(err)
      }
      for (const field of ['website', 'linkedin'] as const) {
        if (field in updateData) {
          const err = validateHttpUrl(field, updateData[field])
          if (err) return ctx.badRequest(err)
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
