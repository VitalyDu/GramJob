import type { Core } from '@strapi/strapi'
import { canPublishResume, canEditResume, canArchiveResume } from '../services/resume-utils'
import { checkIsMaxPlan } from '../policies/requires-max-plan'
import { toArray } from '../../../utils/query'
import type resumeServiceFactory from '../services/resume'

type ResumeService = ReturnType<typeof resumeServiceFactory>

const VALID_WORK_FORMATS = ['office', 'remote', 'hybrid', 'any'] as const
const VALID_EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'freelance',
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

const RESUME_FULL_FIELDS = [...RESUME_CARD_FIELDS, 'about', 'contacts', 'invitations'] as const

const RESUME_OWNER_CARD_FIELDS = [
  ...RESUME_CARD_FIELDS,
  'rejectionReason',
  'rejectionComment',
] as const

const RESUME_POPULATE = {
  user: { fields: ['id', 'firstName', 'lastName'] },
  avatar: true,
  workExperience: true,
  education: true,
} as const

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::resume.resume') as unknown as ResumeService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const body = ctx.request.body as Record<string, unknown>
      const { title, firstName, lastName, country, workFormat, employmentType } = body

      if (!title || !firstName || !lastName || !country || !workFormat || !employmentType) {
        return ctx.badRequest(
          'title, firstName, lastName, country, workFormat, employmentType are required'
        )
      }

      if (
        !Array.isArray(workFormat) ||
        (workFormat as any[]).length === 0 ||
        (workFormat as any[]).some((v: unknown) => !VALID_WORK_FORMATS.includes(v as any))
      ) {
        return ctx.badRequest(
          `workFormat must be a non-empty array with values from: ${VALID_WORK_FORMATS.join(', ')}`
        )
      }
      if (
        !Array.isArray(employmentType) ||
        (employmentType as any[]).length === 0 ||
        (employmentType as any[]).some((v: unknown) => !VALID_EMPLOYMENT_TYPES.includes(v as any))
      ) {
        return ctx.badRequest(
          `employmentType must be a non-empty array with values from: ${VALID_EMPLOYMENT_TYPES.join(', ')}`
        )
      }

      const resume = await svc().createResume(user.id, {
        title: title as string,
        firstName: firstName as string,
        lastName: lastName as string,
        country: country as string,
        city: body.city as string | undefined,
        desiredSalary: body.desiredSalary as number | undefined,
        currency: body.currency as string | undefined,
        workFormat: workFormat as string[],
        employmentType: employmentType as string[],
        experienceYears: body.experienceYears as number | undefined,
        about: body.about as string | undefined,
        skills: body.skills as string[] | undefined,
        languages: body.languages as Array<{ lang: string; level: string }> | undefined,
        contacts: body.contacts as any,
        workExperience: body.workExperience as any,
        education: body.education as any,
      })

      return ctx.send({ data: resume }, 201)
    },

    async publish(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const resume = await (strapi.documents as any)('api::resume.resume').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })
      if (!resume) return ctx.notFound('Resume not found')

      const status = resume.moderationStatus as string
      if (!canPublishResume(status)) {
        return ctx.badRequest(
          `Cannot publish resume with status "${status}". Must be "draft" or "rejected".`
        )
      }

      const updated = await (strapi.documents as any)('api::resume.resume').update({
        documentId: id,
        data: { moderationStatus: 'moderation' },
        fields: RESUME_OWNER_CARD_FIELDS,
        populate: RESUME_POPULATE,
      })

      return ctx.send({ data: updated })
    },

    async findPublic(ctx: any) {
      const rawQuery = ctx.query as Record<string, string | string[]>
      const {
        search,
        country,
        city,
        experienceYears,
        page = '1',
        pageSize = '20',
      } = rawQuery as Record<string, string>

      const workFormats = toArray(rawQuery.workFormat)
      const employmentTypes = toArray(rawQuery.employmentType)

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))

      // Pre-query JSON array filters
      let jsonFilterIds: string[] | null = null
      if (workFormats.length > 0 || employmentTypes.length > 0) {
        jsonFilterIds = await svc().getIdsByJsonArrayFilters({
          ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
          ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
        })
        if (jsonFilterIds.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }
      }

      const filters: Record<string, unknown> = { moderationStatus: { $eq: 'published' } }

      if (jsonFilterIds !== null) filters.documentId = { $in: jsonFilterIds }
      if (country) filters.country = { $eq: country }
      if (city) filters.city = { $containsi: city }
      if (experienceYears) {
        const years = parseInt(experienceYears, 10)
        if (!isNaN(years)) filters.experienceYears = { $lte: years }
      }
      if (search) {
        filters.$or = [
          { title: { $containsi: search } },
          { firstName: { $containsi: search } },
          { lastName: { $containsi: search } },
        ]
      }

      const [resumes, total] = await Promise.all([
        (strapi.documents as any)('api::resume.resume').findMany({
          filters,
          fields: RESUME_CARD_FIELDS as any,
          populate: { user: { fields: ['id', 'firstName', 'lastName'] }, avatar: true } as any,
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        (strapi.documents as any)('api::resume.resume').count({ filters }),
      ])

      return ctx.send({
        data: resumes,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },

    async findOne(ctx: any) {
      const requestUser = ctx.state.user as { id: number } | undefined
      if (!requestUser) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const resume = await (strapi.documents as any)('api::resume.resume').findOne({
        documentId: id,
        fields: RESUME_FULL_FIELDS as any,
        populate: RESUME_POPULATE as any,
      })

      if (!resume) {
        return ctx.notFound('Resume not found')
      }

      const resumeOwnerId = resume.user?.id
      const isOwner = requestUser.id === resumeOwnerId

      // Owner can open their own resume in any status (edit flow); others see only published
      if (!isOwner && resume.moderationStatus !== 'published') {
        return ctx.notFound('Resume not found')
      }

      // Resume database is a Max/VIP feature, but employers can always view resumes
      // of candidates who applied to their vacancies (regardless of plan)
      if (!isOwner) {
        const applicationResult = await strapi.db.connection.raw(
          `SELECT a.id
           FROM applications a
           JOIN resumes r ON r.id = a.resume_id
           JOIN vacancies v ON v.id = a.vacancy_id
           WHERE r.document_id = ?
             AND v.posted_by_id = ?
           LIMIT 1`,
          [id, requestUser.id]
        )
        const hasIncomingApplication = (applicationResult.rows?.length ?? 0) > 0

        if (!hasIncomingApplication) {
          const viewer = (await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: requestUser.id },
            select: ['subscriptionPlan'],
          })) as { subscriptionPlan: string } | null

          if (!checkIsMaxPlan(viewer ?? { subscriptionPlan: 'free' })) {
            return ctx.send(
              {
                error: {
                  code: 'SUBSCRIPTION_REQUIRED',
                  message: 'Max subscription plan required to access resume database',
                },
              },
              403
            )
          }
        }
      }

      // Owner's own views must not inflate the counter
      let newViews = resume.views ?? 0
      if (!isOwner) {
        newViews += 1
        await (strapi.documents as any)('api::resume.resume').update({
          documentId: id,
          data: { views: newViews },
        })
      }

      let contacts: unknown = null

      if (requestUser) {
        if (isOwner) {
          contacts = resume.contacts
        } else {
          // Raw SQL is used here because Strapi 5 Document Service does not reliably
          // support multi-level deep relation filters (resume→user→id, vacancy→postedBy→id)
          const result = await strapi.db.connection.raw(
            `SELECT a.id
             FROM applications a
             JOIN resumes r ON r.id = a.resume_id
             JOIN vacancies v ON v.id = a.vacancy_id
             WHERE r.user_id = ?
               AND v.posted_by_id = ?
               AND a.status IN ('in-review', 'interview', 'test-task', 'offer', 'hired')
             LIMIT 1`,
            [resumeOwnerId, requestUser.id]
          )
          if ((result.rows?.length ?? 0) > 0) contacts = (resume as any).contacts
        }
      }

      return ctx.send({ data: { ...resume, views: newViews, contacts } })
    },

    async update(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }
      const body = ctx.request.body as Record<string, unknown>

      const existing = await (strapi.documents as any)('api::resume.resume').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })
      if (!existing) return ctx.notFound('Resume not found')

      const status = existing.moderationStatus as string
      if (!canEditResume(status)) {
        return ctx.badRequest(`Cannot edit resume with status "${status}".`)
      }

      const allowedFields = [
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
        'about',
        'skills',
        'languages',
        'contacts',
        'workExperience',
        'education',
      ]

      const updateData: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (field in body) updateData[field] = body[field]
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No updatable fields provided.')
      }

      if ('workFormat' in updateData) {
        const wf = updateData.workFormat as unknown
        if (
          !Array.isArray(wf) ||
          (wf as any[]).length === 0 ||
          (wf as any[]).some((v: unknown) => !VALID_WORK_FORMATS.includes(v as any))
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
          (et as any[]).some((v: unknown) => !VALID_EMPLOYMENT_TYPES.includes(v as any))
        ) {
          return ctx.badRequest(
            `employmentType must be a non-empty array with values from: ${VALID_EMPLOYMENT_TYPES.join(', ')}`
          )
        }
      }

      updateData.moderationStatus = 'moderation'

      const updated = await (strapi.documents as any)('api::resume.resume').update({
        documentId: id,
        data: updateData as any,
        fields: RESUME_FULL_FIELDS as any,
        populate: RESUME_POPULATE as any,
      })

      return ctx.send({ data: updated })
    },

    async archive(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const resume = await (strapi.documents as any)('api::resume.resume').findOne({
        documentId: id,
        fields: ['documentId', 'moderationStatus'],
      })
      if (!resume) return ctx.notFound('Resume not found')

      if (!canArchiveResume(resume.moderationStatus as string)) {
        return ctx.badRequest(`Cannot archive resume with status "${resume.moderationStatus}".`)
      }

      const updated = await (strapi.documents as any)('api::resume.resume').update({
        documentId: id,
        data: { moderationStatus: 'archived' },
        fields: RESUME_OWNER_CARD_FIELDS,
        populate: RESUME_POPULATE,
      })

      return ctx.send({ data: updated })
    },

    async findMine(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { status, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

      const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
      if (status) filters.moderationStatus = { $eq: status }

      const [resumes, total] = await Promise.all([
        (strapi.documents as any)('api::resume.resume').findMany({
          filters,
          fields: RESUME_OWNER_CARD_FIELDS as any,
          populate: { avatar: true } as any,
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        (strapi.documents as any)('api::resume.resume').count({ filters }),
      ])

      return ctx.send({
        data: resumes,
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
