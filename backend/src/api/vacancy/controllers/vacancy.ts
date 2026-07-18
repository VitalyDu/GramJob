import type { Core } from '@strapi/strapi'
import { canPublish, canBoost, canArchive, canEdit } from '../services/vacancy-utils'
import {
  checkAndConsumeVacancyCredit,
  checkAndConsumeBoost,
  refundVacancyCredit,
  refundBoost,
} from '../services/credit-service'
import { getBlockedIds } from '../../block/services/block-filter'
import { resolveOptionalUserId } from '../../../utils/optional-auth'
import { toArray } from '../../../utils/query'
import { notifyLimitReached } from '../../../services/limit-notify'
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
  'moderationStatus',
  'expiresAt',
  'createdAt',
  'views',
  'applicationsCount',
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
  'uniqueViews',
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

      if (
        !Array.isArray(workFormat) ||
        (workFormat as any[]).length === 0 ||
        (workFormat as any[]).some((v) => !VALID_WORK_FORMATS.includes(v))
      ) {
        return ctx.badRequest(
          `workFormat must be a non-empty array with values from: ${VALID_WORK_FORMATS.join(', ')}`
        )
      }
      if (
        !Array.isArray(employmentType) ||
        (employmentType as any[]).length === 0 ||
        (employmentType as any[]).some((v) => !VALID_EMPLOYMENT_TYPES.includes(v))
      ) {
        return ctx.badRequest(
          `employmentType must be a non-empty array with values from: ${VALID_EMPLOYMENT_TYPES.join(', ')}`
        )
      }
      if (
        !Array.isArray(seniority) ||
        (seniority as any[]).length === 0 ||
        (seniority as any[]).some((v) => !VALID_SENIORITIES.includes(v))
      ) {
        return ctx.badRequest(
          `seniority must be a non-empty array with values from: ${VALID_SENIORITIES.join(', ')}`
        )
      }

      if (body.companyId) {
        const company = await strapi.documents('api::company.company').findOne({
          documentId: body.companyId as string,
          populate: { owner: { fields: ['id'] } },
          fields: ['documentId', 'moderationStatus'],
        })
        if (!company || (company as any).owner?.id !== user.id) {
          return ctx.forbidden('You do not own this company')
        }
        if ((company as any).moderationStatus !== 'published') {
          return ctx.badRequest('Company must be published to post vacancies')
        }
      }

      let creditSource: 'plan' | 'package'
      try {
        const result = await checkAndConsumeVacancyCredit(strapi, user.id)
        creditSource = result.source
      } catch (err: any) {
        if (err?.code === 'LIMIT_REACHED') {
          notifyLimitReached(strapi, user.id, 'monthly_vacancies')
          return ctx.send(
            {
              error: {
                code: 'LIMIT_REACHED',
                message: 'Vacancy limit reached',
                details: err.details,
              },
            },
            403
          )
        }
        throw err
      }

      let vacancy: Awaited<ReturnType<VacancyService['createVacancy']>>
      try {
        vacancy = await svc().createVacancy(user.id, {
          title: title as string,
          industryId: industryId as string,
          specializationId: specializationId as string,
          employmentType: employmentType as string[],
          workFormat: workFormat as string[],
          seniority: seniority as string[],
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
          languages: body.languages as string[] | undefined,
          experienceYears: body.experienceYears as number | undefined,
          sourceType: (body.sourceType as 'internal' | 'external') ?? 'internal',
          sourceName: body.sourceName as string | undefined,
          sourceUrl: body.sourceUrl as string | undefined,
          urgent: body.urgent as boolean | undefined,
          companyId: body.companyId as string | undefined,
        })
      } catch (createErr: any) {
        if (creditSource === 'package') {
          await refundVacancyCredit(strapi, user.id)
        }
        throw createErr
      }

      const populated = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: vacancy.documentId,
        fields: VACANCY_CARD_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      return ctx.send({ data: populated }, 201)
    },

    async publish(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      const status = (vacancy as any).moderationStatus as string
      if (!canPublish(status)) {
        return ctx.badRequest(
          `Cannot publish vacancy with status "${status}". Must be "draft", "rejected", or "expired".`
        )
      }

      try {
        await checkAndConsumeVacancyCredit(strapi, user.id)
      } catch (err: any) {
        if (err?.code === 'LIMIT_REACHED') {
          notifyLimitReached(strapi, user.id, 'monthly_vacancies')
          return ctx.send(
            {
              error: {
                code: 'LIMIT_REACHED',
                message: 'Vacancy limit reached',
                details: err.details,
              },
            },
            403
          )
        }
        throw err
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { moderationStatus: 'moderation' } as any,
        fields: VACANCY_CARD_FIELDS as any,
        populate: VACANCY_POPULATE as any,
      })

      return ctx.send({ data: updated })
    },

    async findPublished(ctx: any) {
      const rawQuery = ctx.query as Record<string, string | string[]>
      const {
        search,
        industry,
        specialization,
        country,
        city,
        salaryFrom,
        salaryTo,
        salaryCurrency,
        experienceYears,
        sourceType,
        urgent,
        topPlacement,
        highlighted,
        sort = 'relevance',
        page = '1',
        pageSize = '20',
      } = rawQuery as Record<string, string>

      const workFormats = toArray(rawQuery.workFormat)
      const employmentTypes = toArray(rawQuery.employmentType)
      const seniorities = toArray(rawQuery.seniority)
      const skills = toArray(rawQuery.skills)
      const languages = toArray(rawQuery.languages)

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))
      const offset = (pageNum - 1) * pageSizeNum

      // Pre-query JSON array filters (workFormat/employmentType/seniority/skills/languages are JSON string arrays)
      let jsonFilterIds: string[] | null = null
      if (
        workFormats.length > 0 ||
        employmentTypes.length > 0 ||
        seniorities.length > 0 ||
        skills.length > 0 ||
        languages.length > 0
      ) {
        jsonFilterIds = await svc().getIdsByJsonArrayFilters({
          ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
          ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
          ...(seniorities.length > 0 ? { seniority: seniorities } : {}),
          ...(skills.length > 0 ? { skills } : {}),
          ...(languages.length > 0 ? { languages } : {}),
        })
        if (jsonFilterIds.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }
      }

      // Block filter: hide vacancies from blocked users/companies
      let blockedUserIds: number[] = []
      let blockedCompanyIds: number[] = []
      const viewerId = await resolveOptionalUserId(strapi, ctx)
      if (viewerId) {
        const blocked = await getBlockedIds(strapi, viewerId)
        blockedUserIds = blocked.userIds
        blockedCompanyIds = blocked.companyIds
      }

      const sortMap: Record<string, string> = {
        newest: 'createdAt:desc',
        salary_asc: 'salaryFrom:asc',
        salary_desc: 'salaryFrom:desc',
        // VIP-вакансии (highlighted=true через beforeCreate) идут выше при равных факторах
        relevance: 'highlighted:desc,topPlacement:desc,boostedAt:desc,createdAt:desc',
      }
      const strapiSort = sortMap[sort] ?? sortMap.relevance

      // Full-text search via raw SQL
      if (search) {
        // Build SQL fragments to exclude blocked users/companies at SQL level (avoids page underfill).
        const userBlockSql =
          blockedUserIds.length > 0
            ? `AND id NOT IN (SELECT vacancy_id FROM vacancies_posted_by_lnk WHERE user_id IN (${blockedUserIds.map(() => '?').join(',')}))`
            : ''
        const companyBlockSql =
          blockedCompanyIds.length > 0
            ? `AND id NOT IN (SELECT vacancy_id FROM vacancies_company_lnk WHERE company_id IN (${blockedCompanyIds.map(() => '?').join(',')}))`
            : ''
        const blockSql = [userBlockSql, companyBlockSql].filter(Boolean).join(' ')
        const blockParams = [...blockedUserIds, ...blockedCompanyIds]

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

        // Intersect FTS IDs with format pre-query IDs (if format filters active)
        const idsForFts =
          jsonFilterIds !== null
            ? (() => {
                const s = new Set(jsonFilterIds)
                return allFtsIds.filter((id) => s.has(id))
              })()
            : allFtsIds

        if (idsForFts.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }

        // Build filters that include FTS IDs + all user-requested filters
        const baseFilters: Record<string, unknown> = {
          documentId: { $in: idsForFts },
          moderationStatus: { $eq: 'published' },
          expiresAt: { $gt: new Date().toISOString() },
        }
        if (industry) baseFilters.industry = { documentId: { $eq: industry } }
        if (specialization) baseFilters.specialization = { documentId: { $eq: specialization } }
        if (country) baseFilters.country = { $eq: country }
        if (city) baseFilters.city = { $containsi: city }
        if (salaryCurrency) baseFilters.salaryCurrency = { $eq: salaryCurrency }
        if (salaryFrom) baseFilters.salaryTo = { $gte: parseInt(salaryFrom, 10) }
        if (salaryTo) baseFilters.salaryFrom = { $lte: parseInt(salaryTo, 10) }
        if (sourceType) baseFilters.sourceType = { $eq: sourceType }
        if (urgent === 'true') baseFilters.urgent = { $eq: true }
        if (topPlacement === 'true') baseFilters.topPlacement = { $eq: true }
        if (highlighted === 'true') baseFilters.highlighted = { $eq: true }
        if (experienceYears) {
          const years = parseInt(experienceYears, 10)
          if (!isNaN(years)) baseFilters.experienceYears = { $lte: years }
        }
        if (blockedUserIds.length > 0) {
          baseFilters.postedBy = { id: { $notIn: blockedUserIds } }
        }
        if (blockedCompanyIds.length > 0) {
          baseFilters.company = { id: { $notIn: blockedCompanyIds } }
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

        // Intersect page IDs with format filter (if active) before hydrating
        const hydrateIds =
          jsonFilterIds !== null
            ? (() => {
                const s = new Set(jsonFilterIds)
                return pageIds.filter((id) => s.has(id))
              })()
            : pageIds

        const vacancies = await strapi.documents('api::vacancy.vacancy').findMany({
          filters: { ...baseFilters, documentId: { $in: hydrateIds } },
          fields: VACANCY_CARD_FIELDS as any,
          populate: VACANCY_POPULATE as any,
        })

        // Re-sort to match SQL relevance order
        const sorted = hydrateIds
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
        moderationStatus: { $eq: 'published' },
        expiresAt: { $gt: new Date().toISOString() },
      }

      if (jsonFilterIds !== null) filters.documentId = { $in: jsonFilterIds }
      if (industry) filters.industry = { documentId: { $eq: industry } }
      if (specialization) filters.specialization = { documentId: { $eq: specialization } }
      if (country) filters.country = { $eq: country }
      if (city) filters.city = { $containsi: city }
      if (salaryCurrency) filters.salaryCurrency = { $eq: salaryCurrency }
      if (salaryFrom) filters.salaryTo = { $gte: parseInt(salaryFrom, 10) }
      if (salaryTo) filters.salaryFrom = { $lte: parseInt(salaryTo, 10) }
      if (sourceType) filters.sourceType = { $eq: sourceType }
      if (urgent === 'true') filters.urgent = { $eq: true }
      if (topPlacement === 'true') filters.topPlacement = { $eq: true }
      if (highlighted === 'true') filters.highlighted = { $eq: true }
      if (experienceYears) {
        const years = parseInt(experienceYears, 10)
        if (!isNaN(years)) filters.experienceYears = { $lte: years }
      }
      if (blockedUserIds.length > 0) {
        filters.postedBy = { id: { $notIn: blockedUserIds } }
      }
      if (blockedCompanyIds.length > 0) {
        filters.company = { id: { $notIn: blockedCompanyIds } }
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
          moderationStatus: { $eq: 'published' },
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
        fields: ['documentId', 'moderationStatus'],
      })
      if (!existing) return ctx.notFound('Vacancy not found')

      const status = (existing as any).moderationStatus as string
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

      if ('workFormat' in updateData) {
        const wf = updateData.workFormat as unknown
        if (
          !Array.isArray(wf) ||
          (wf as any[]).length === 0 ||
          (wf as any[]).some((v) => !VALID_WORK_FORMATS.includes(v))
        ) {
          return ctx.badRequest(
            `workFormat must be a non-empty array with values from: ${VALID_WORK_FORMATS.join(', ')}`
          )
        }
      }
      if ('employmentType' in updateData) {
        const et = updateData.employmentType as unknown
        if (
          !Array.isArray(et) ||
          (et as any[]).length === 0 ||
          (et as any[]).some((v) => !VALID_EMPLOYMENT_TYPES.includes(v))
        ) {
          return ctx.badRequest(
            `employmentType must be a non-empty array with values from: ${VALID_EMPLOYMENT_TYPES.join(', ')}`
          )
        }
      }
      if ('seniority' in updateData) {
        const s = updateData.seniority as unknown
        if (
          !Array.isArray(s) ||
          (s as any[]).length === 0 ||
          (s as any[]).some((v) => !VALID_SENIORITIES.includes(v))
        ) {
          return ctx.badRequest(
            `seniority must be a non-empty array with values from: ${VALID_SENIORITIES.join(', ')}`
          )
        }
      }

      if ('industryId' in body) {
        const industry = await strapi.documents('api::industry.industry').findOne({
          documentId: body.industryId as string,
          fields: ['documentId'],
        })
        if (!industry) return ctx.badRequest('Industry not found')
        updateData.industry = body.industryId
      }

      if ('specializationId' in body) {
        const specialization = await strapi
          .documents('api::specialization.specialization')
          .findOne({
            documentId: body.specializationId as string,
            fields: ['documentId'],
          })
        if (!specialization) return ctx.badRequest('Specialization not found')
        updateData.specialization = body.specializationId
      }

      if ('companyId' in body) {
        if (body.companyId) {
          const company = await strapi.documents('api::company.company').findOne({
            documentId: body.companyId as string,
            populate: { owner: { fields: ['id'] } },
            fields: ['documentId', 'moderationStatus'],
          })
          if (!company || (company as any).owner?.id !== user.id) {
            return ctx.forbidden('You do not own this company')
          }
          if ((company as any).moderationStatus !== 'published') {
            return ctx.badRequest('Company must be published to post vacancies')
          }
          updateData.company = body.companyId
        } else {
          updateData.company = null
        }
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No updatable fields provided.')
      }

      // Спека redesign §9: любое редактирование возвращает вакансию на модерацию
      updateData.moderationStatus = 'moderation'
      updateData.expiresAt = null

      // For draft/rejected vacancies: they are not counted in the plan limit yet,
      // so resubmitting via update would bypass the credit check — enforce it here.
      let updateCreditSource: 'plan' | 'package' | null = null
      if (status === 'draft' || status === 'rejected') {
        try {
          const result = await checkAndConsumeVacancyCredit(strapi, user.id)
          updateCreditSource = result.source
        } catch (err: any) {
          if (err?.code === 'LIMIT_REACHED') {
            return ctx.send(
              {
                error: {
                  code: 'LIMIT_REACHED',
                  message: 'Vacancy limit reached',
                  details: err.details,
                },
              },
              403
            )
          }
          throw err
        }
      }

      let updated: any
      try {
        updated = await strapi.documents('api::vacancy.vacancy').update({
          documentId: id,
          data: updateData as any,
          fields: VACANCY_FULL_FIELDS as any,
          populate: VACANCY_POPULATE as any,
        })
      } catch (updateErr: any) {
        if (updateCreditSource === 'package') {
          await refundVacancyCredit(strapi, user.id)
        }
        throw updateErr
      }

      return ctx.send({ data: updated })
    },

    async boost(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      if (!canBoost((vacancy as any).moderationStatus as string)) {
        return ctx.badRequest(
          `Cannot boost vacancy with status "${(vacancy as any).moderationStatus}". Must be "published".`
        )
      }

      let consumed: Awaited<ReturnType<typeof checkAndConsumeBoost>>
      try {
        consumed = await checkAndConsumeBoost(strapi, user.id)
      } catch (err: any) {
        if (err?.code === 'LIMIT_REACHED') {
          notifyLimitReached(strapi, user.id, 'daily_boosts')
          return ctx.send(
            {
              error: {
                code: 'LIMIT_REACHED',
                message: 'Daily boost limit reached',
                details: err.details,
              },
            },
            403
          )
        }
        throw err
      }

      try {
        await strapi.documents('api::vacancy.vacancy').update({
          documentId: id,
          data: { boostedAt: new Date().toISOString() },
        })
      } catch (updateErr) {
        // Буст не должен «сгорать», если апдейт не прошёл
        await refundBoost(strapi, user.id, consumed.source).catch(() => {})
        throw updateErr
      }

      return ctx.send({ data: { success: true, boostsRemaining: consumed.boostsRemaining } })
    },

    async archive(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      if (!canArchive((vacancy as any).moderationStatus as string)) {
        return ctx.badRequest(
          `Cannot archive vacancy with status "${(vacancy as any).moderationStatus}".`
        )
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { moderationStatus: 'archived' } as any,
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
      if (status) filters.moderationStatus = { $eq: status }

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
