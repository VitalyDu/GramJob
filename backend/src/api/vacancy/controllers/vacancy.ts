import type { Core } from '@strapi/strapi'
import {
  canPublish,
  canBoost,
  canArchive,
  canEdit,
  publishedTransitionsOnEdit,
} from '../services/vacancy-utils'
import { checkAndConsumeVacancyCredit, checkAndConsumeBoost } from '../services/credit-service'
import { getBlockedUserIds } from '../../block/services/block-filter'
import type vacancyServiceFactory from '../services/vacancy'

type VacancyService = ReturnType<typeof vacancyServiceFactory>

const VALID_EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'freelance',
] as const
const VALID_WORK_FORMATS = ['office', 'remote', 'hybrid'] as const
const VALID_SENIORITIES = ['intern', 'junior', 'middle', 'senior', 'lead', 'principal'] as const

// In-memory unique-view tracker (resets on restart — sufficient for MVP)
const viewedIPs = new Map<string, Set<string>>()

function isUniqueView(documentId: string, ip: string): boolean {
  return !(viewedIPs.get(documentId)?.has(ip) ?? false)
}

function recordView(documentId: string, ip: string): void {
  if (!viewedIPs.has(documentId)) viewedIPs.set(documentId, new Set())
  viewedIPs.get(documentId)!.add(ip)
}

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
  'status',
  'expiresAt',
  'createdAt',
] as const

const VACANCY_FULL_FIELDS = [
  ...VACANCY_CARD_FIELDS,
  'description',
  'responsibilities',
  'requirements',
  'conditions',
  'skills',
  'languages',
  'experienceYears',
  'sourceName',
  'sourceUrl',
  'views',
  'uniqueViews',
  'applicationsCount',
] as const

const REJECTION_FIELDS = ['rejectionReason', 'rejectionComment'] as const

const VACANCY_OWNER_CARD_FIELDS = [...VACANCY_CARD_FIELDS, ...REJECTION_FIELDS] as const
const VACANCY_OWNER_FULL_FIELDS = [...VACANCY_FULL_FIELDS, ...REJECTION_FIELDS] as const

const VACANCY_POPULATE = {
  industry: { fields: ['documentId', 'slug', 'name'] },
  specialization: { fields: ['documentId', 'slug', 'name'] },
  company: { fields: ['documentId', 'name', 'slug'], populate: { logo: true } },
  postedBy: { fields: ['id', 'firstName', 'lastName'] },
} as const

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::vacancy.vacancy') as unknown as VacancyService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const body = ctx.request.body as Record<string, unknown>

      const {
        title,
        industryId,
        specializationId,
        employmentType,
        workFormat,
        seniority,
        country,
        description,
        responsibilities,
        requirements,
      } = body

      if (
        !title ||
        !industryId ||
        !specializationId ||
        !employmentType ||
        !workFormat ||
        !seniority ||
        !country ||
        !description ||
        !responsibilities ||
        !requirements
      ) {
        return ctx.badRequest(
          'title, industryId, specializationId, employmentType, workFormat, seniority, country, description, responsibilities, requirements are required'
        )
      }

      if (!VALID_EMPLOYMENT_TYPES.includes(employmentType as any)) {
        return ctx.badRequest(`employmentType must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`)
      }
      if (!VALID_WORK_FORMATS.includes(workFormat as any)) {
        return ctx.badRequest(`workFormat must be one of: ${VALID_WORK_FORMATS.join(', ')}`)
      }
      if (!VALID_SENIORITIES.includes(seniority as any)) {
        return ctx.badRequest(`seniority must be one of: ${VALID_SENIORITIES.join(', ')}`)
      }

      if (body.companyId) {
        const company = await strapi.documents('api::company.company').findOne({
          documentId: body.companyId as string,
          populate: { owner: { fields: ['id'] } },
          fields: ['documentId', 'status'],
        })
        if (!company || (company as any).owner?.id !== user.id) {
          return ctx.forbidden('You do not own this company')
        }
        if ((company as any).status !== 'published') {
          return ctx.badRequest('Company must be published to post vacancies')
        }
      }

      const vacancy = await svc().createVacancy(user.id, {
        title: title as string,
        industryId: industryId as string,
        specializationId: specializationId as string,
        employmentType: employmentType as string,
        workFormat: workFormat as string,
        seniority: seniority as string,
        country: country as string,
        city: body.city as string | undefined,
        salaryFrom: body.salaryFrom as number | undefined,
        salaryTo: body.salaryTo as number | undefined,
        salaryCurrency: body.salaryCurrency as string | undefined,
        description: description as string,
        responsibilities: responsibilities as string,
        requirements: requirements as string,
        conditions: body.conditions as string | undefined,
        skills: body.skills as string[] | undefined,
        languages: body.languages as Array<{ lang: string; level: string }> | undefined,
        experienceYears: body.experienceYears as number | undefined,
        sourceType: (body.sourceType as 'internal' | 'external') ?? 'internal',
        sourceName: body.sourceName as string | undefined,
        sourceUrl: body.sourceUrl as string | undefined,
        urgent: body.urgent as boolean | undefined,
        companyId: body.companyId as string | undefined,
      })

      const populated = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: vacancy.documentId,
        fields: VACANCY_CARD_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      ctx.status = 201
      return ctx.send({ data: populated })
    },

    async publish(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      const status = vacancy.status as string
      if (!canPublish(status)) {
        return ctx.badRequest(
          `Cannot publish vacancy with status "${status}". Must be "draft", "rejected", or "expired".`
        )
      }

      try {
        await checkAndConsumeVacancyCredit(strapi, user.id)
      } catch (err: any) {
        if (err?.code === 'LIMIT_REACHED') {
          ctx.status = 403
          return ctx.send({
            error: {
              code: 'LIMIT_REACHED',
              message: 'Vacancy limit reached',
              details: err.details,
            },
          })
        }
        throw err
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { status: 'moderation' },
        fields: VACANCY_CARD_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      return ctx.send({ data: updated })
    },

    async findPublished(ctx: any) {
      const {
        search,
        industry,
        specialization,
        country,
        city,
        workFormat,
        employmentType,
        seniority,
        salaryFrom,
        salaryTo,
        salaryCurrency,
        sourceType,
        urgent,
        topPlacement,
        sort = 'relevance',
        page = '1',
        pageSize = '20',
      } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))
      const offset = (pageNum - 1) * pageSizeNum

      // Block filter: hide vacancies from users the current user has blocked
      let blockedUserIds: number[] = []
      if (ctx.state.user) {
        blockedUserIds = await getBlockedUserIds(strapi, (ctx.state.user as { id: number }).id)
      }

      const sortMap: Record<string, string> = {
        newest: 'createdAt:desc',
        salary_asc: 'salaryFrom:asc',
        salary_desc: 'salaryFrom:desc',
        relevance: 'topPlacement:desc,boostedAt:desc,createdAt:desc',
      }
      const strapiSort = sortMap[sort] ?? sortMap.relevance

      // Full-text search via raw SQL
      if (search) {
        // Build SQL fragment to exclude blocked users (applied at SQL level to avoid page underfill)
        const blockSql =
          blockedUserIds.length > 0
            ? `AND posted_by_id NOT IN (${blockedUserIds.map(() => '?').join(',')})`
            : ''
        const blockParams = blockedUserIds.length > 0 ? blockedUserIds : []

        // Get all FTS-matching IDs (SQL handles status+expiresAt; no pagination here for accurate count)
        const { documentIds: allFtsIds } = await svc().searchByVector(
          search,
          0,
          10000,
          blockSql,
          blockParams
        )

        if (allFtsIds.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }

        // Build filters that include FTS IDs + all user-requested filters
        const baseFilters: Record<string, unknown> = {
          documentId: { $in: allFtsIds },
          status: { $eq: 'published' },
          expiresAt: { $gt: new Date().toISOString() },
        }
        if (industry) baseFilters.industry = { documentId: { $eq: industry } }
        if (specialization) baseFilters.specialization = { documentId: { $eq: specialization } }
        if (country) baseFilters.country = { $eq: country }
        if (city) baseFilters.city = { $containsi: city }
        if (workFormat) baseFilters.workFormat = { $eq: workFormat }
        if (employmentType) baseFilters.employmentType = { $eq: employmentType }
        if (seniority) baseFilters.seniority = { $eq: seniority }
        if (salaryCurrency) baseFilters.salaryCurrency = { $eq: salaryCurrency }
        if (salaryFrom) baseFilters.salaryTo = { $gte: parseInt(salaryFrom, 10) }
        if (salaryTo) baseFilters.salaryFrom = { $lte: parseInt(salaryTo, 10) }
        if (sourceType) baseFilters.sourceType = { $eq: sourceType }
        if (urgent === 'true') baseFilters.urgent = { $eq: true }
        if (topPlacement === 'true') baseFilters.topPlacement = { $eq: true }
        if (blockedUserIds.length > 0) {
          baseFilters.postedBy = { id: { $notIn: blockedUserIds } }
        }

        // Accurate total: counts only docs that pass all filters (including extra ones)
        const total = await strapi.documents('api::vacancy.vacancy').count({ filters: baseFilters })

        if (total === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }

        if (sort !== 'relevance' && sortMap[sort]) {
          // Non-relevance sort: Strapi handles ordering and pagination
          const vacancies = await strapi.documents('api::vacancy.vacancy').findMany({
            filters: baseFilters,
            fields: VACANCY_CARD_FIELDS as any,
            populate: VACANCY_POPULATE as any,
            start: offset,
            limit: pageSizeNum,
            sort: sortMap[sort] as any,
          })
          return ctx.send({
            data: vacancies,
            meta: {
              total,
              page: pageNum,
              pageSize: pageSizeNum,
              pageCount: Math.ceil(total / pageSizeNum),
            },
          })
        }

        // Relevance sort: SQL handles pagination and ordering, Strapi hydrates the fields
        const { documentIds: pageIds } = await svc().searchByVector(
          search,
          offset,
          pageSizeNum,
          blockSql,
          blockParams
        )

        if (pageIds.length === 0) {
          return ctx.send({
            data: [],
            meta: {
              total,
              page: pageNum,
              pageSize: pageSizeNum,
              pageCount: Math.ceil(total / pageSizeNum),
            },
          })
        }

        const vacancies = await strapi.documents('api::vacancy.vacancy').findMany({
          filters: { ...baseFilters, documentId: { $in: pageIds } },
          fields: VACANCY_CARD_FIELDS as any,
          populate: VACANCY_POPULATE as any,
        })

        // Re-sort to match SQL relevance order
        const sorted = pageIds
          .map((docId) => vacancies.find((v) => v.documentId === docId))
          .filter((v): v is NonNullable<typeof v> => v != null)

        return ctx.send({
          data: sorted,
          meta: {
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            pageCount: Math.ceil(total / pageSizeNum),
          },
        })
      }

      // Standard filter-based listing
      const filters: Record<string, unknown> = {
        status: { $eq: 'published' },
        expiresAt: { $gt: new Date().toISOString() },
      }

      if (industry) filters.industry = { documentId: { $eq: industry } }
      if (specialization) filters.specialization = { documentId: { $eq: specialization } }
      if (country) filters.country = { $eq: country }
      if (city) filters.city = { $containsi: city }
      if (workFormat) filters.workFormat = { $eq: workFormat }
      if (employmentType) filters.employmentType = { $eq: employmentType }
      if (seniority) filters.seniority = { $eq: seniority }
      if (salaryCurrency) filters.salaryCurrency = { $eq: salaryCurrency }
      if (salaryFrom) filters.salaryTo = { $gte: parseInt(salaryFrom, 10) }
      if (salaryTo) filters.salaryFrom = { $lte: parseInt(salaryTo, 10) }
      if (sourceType) filters.sourceType = { $eq: sourceType }
      if (urgent === 'true') filters.urgent = { $eq: true }
      if (topPlacement === 'true') filters.topPlacement = { $eq: true }
      if (blockedUserIds.length > 0) {
        filters.postedBy = { id: { $notIn: blockedUserIds } }
      }

      const [vacancies, total] = await Promise.all([
        strapi.documents('api::vacancy.vacancy').findMany({
          filters,
          fields: VACANCY_CARD_FIELDS as any,
          populate: VACANCY_POPULATE as any,
          start: offset,
          limit: pageSizeNum,
          sort: strapiSort as any,
        }),
        strapi.documents('api::vacancy.vacancy').count({ filters }),
      ])

      return ctx.send({
        data: vacancies,
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

      const vacancy = await strapi.documents('api::vacancy.vacancy').findFirst({
        filters: {
          documentId: { $eq: id },
          status: { $eq: 'published' },
          expiresAt: { $gt: new Date().toISOString() },
        },
        fields: VACANCY_FULL_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      if (!vacancy) return ctx.notFound('Vacancy not found')

      // Server-side fetches (e.g. generateMetadata for SEO) must not inflate view counters
      if ((ctx.query as Record<string, string>).skipViewCount === 'true') {
        return ctx.send({ data: vacancy })
      }

      // Owner's own views must not inflate the counter
      const requestUser = ctx.state.user as { id: number } | undefined
      if (requestUser && requestUser.id === (vacancy as any).postedBy?.id) {
        return ctx.send({ data: vacancy })
      }

      const unique = isUniqueView(id, ip)
      recordView(id, ip)

      const newViews = (vacancy.views ?? 0) + 1
      const newUniqueViews = unique ? (vacancy.uniqueViews ?? 0) + 1 : (vacancy.uniqueViews ?? 0)

      await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { views: newViews, uniqueViews: newUniqueViews },
      })

      return ctx.send({ data: { ...vacancy, views: newViews, uniqueViews: newUniqueViews } })
    },

    async update(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }
      const body = ctx.request.body as Record<string, unknown>

      const existing = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!existing) return ctx.notFound('Vacancy not found')

      const status = existing.status as string
      if (!canEdit(status)) {
        return ctx.badRequest(`Cannot edit vacancy with status "${status}".`)
      }

      const allowedFields = [
        'title',
        'employmentType',
        'workFormat',
        'seniority',
        'country',
        'city',
        'salaryFrom',
        'salaryTo',
        'salaryCurrency',
        'description',
        'responsibilities',
        'requirements',
        'conditions',
        'skills',
        'languages',
        'experienceYears',
        'urgent',
      ]

      const updateData: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (field in body) updateData[field] = body[field]
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No updatable fields provided.')
      }

      if (publishedTransitionsOnEdit(status)) {
        updateData.status = 'draft'
        updateData.expiresAt = null
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: updateData as any,
        fields: VACANCY_FULL_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      return ctx.send({ data: updated })
    },

    async boost(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      if (!canBoost(vacancy.status as string)) {
        return ctx.badRequest(
          `Cannot boost vacancy with status "${vacancy.status}". Must be "published".`
        )
      }

      let boostsRemaining: number
      try {
        boostsRemaining = await checkAndConsumeBoost(strapi, user.id)
      } catch (err: any) {
        if (err?.code === 'LIMIT_REACHED') {
          ctx.status = 403
          return ctx.send({
            error: {
              code: 'LIMIT_REACHED',
              message: 'Daily boost limit reached',
              details: err.details,
            },
          })
        }
        throw err
      }

      await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { boostedAt: new Date().toISOString() },
      })

      return ctx.send({ data: { success: true, boostsRemaining } })
    },

    async archive(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      if (!canArchive(vacancy.status as string)) {
        return ctx.badRequest(`Cannot archive vacancy with status "${vacancy.status}".`)
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { status: 'archived' },
        fields: VACANCY_CARD_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      return ctx.send({ data: updated })
    },

    async findMineById(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findFirst({
        filters: {
          documentId: { $eq: id },
          postedBy: { id: { $eq: user.id } },
        },
        fields: VACANCY_OWNER_FULL_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      if (!vacancy) return ctx.notFound('Vacancy not found')

      return ctx.send({ data: vacancy })
    },

    async findMine(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { status, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

      const filters: Record<string, unknown> = {
        postedBy: { id: { $eq: user.id } },
      }
      if (status) filters.status = { $eq: status }

      const [vacancies, total] = await Promise.all([
        strapi.documents('api::vacancy.vacancy').findMany({
          filters,
          fields: VACANCY_OWNER_CARD_FIELDS as any,
          populate: VACANCY_POPULATE as any,
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc' as any,
        }),
        strapi.documents('api::vacancy.vacancy').count({ filters }),
      ])

      return ctx.send({
        data: vacancies,
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
