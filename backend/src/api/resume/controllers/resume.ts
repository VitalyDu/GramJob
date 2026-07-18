import type { Core } from '@strapi/strapi'
import { canPublishResume, canEditResume, canArchiveResume } from '../services/resume-utils'
import { checkIsMaxPlan } from '../policies/requires-max-plan'
import { getBlockedIds } from '../../block/services/block-filter'
import { toArray } from '../../../utils/query'
import { sendNotification } from '../../../services/notification.service'
import { notifyLimitReached } from '../../../services/limit-notify'
import {
  validateShortText,
  validateLongText,
  validateSalaryRange,
} from '../../../utils/input-validation'
import type resumeServiceFactory from '../services/resume'

// Один resume_viewed на пару (резюме, зритель) до рестарта — чтобы не спамить владельца
const notifiedViewers = new Map<string, Set<number>>()

function shouldNotifyViewer(resumeDocumentId: string, viewerId: number): boolean {
  const set = notifiedViewers.get(resumeDocumentId)
  if (set?.has(viewerId)) return false
  if (!set) notifiedViewers.set(resumeDocumentId, new Set([viewerId]))
  else set.add(viewerId)
  return true
}

// IP-tracker для uniqueViews (аналогично vacancy.viewedIPs)
const viewedIPs = new Map<string, Set<string>>()

function isUniqueViewIP(resumeDocumentId: string, ip: string): boolean {
  return !(viewedIPs.get(resumeDocumentId)?.has(ip) ?? false)
}

function recordViewIP(resumeDocumentId: string, ip: string): void {
  if (!viewedIPs.has(resumeDocumentId)) viewedIPs.set(resumeDocumentId, new Set())
  viewedIPs.get(resumeDocumentId)!.add(ip)
}

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

      for (const [field, val] of [
        ['title', title],
        ['firstName', firstName],
        ['lastName', lastName],
        ['country', country],
        ['city', body.city],
      ] as const) {
        if (val !== undefined && val !== null && val !== '') {
          const err = validateShortText(field, val)
          if (err) return ctx.badRequest(err)
        }
      }
      if (body.about !== undefined && body.about !== null) {
        const err = validateLongText('about', body.about)
        if (err) return ctx.badRequest(err)
      }
      const salaryErr = validateSalaryRange(body.desiredSalary, body.desiredSalary)
      if (salaryErr) return ctx.badRequest(salaryErr)

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

      const fullUser = (await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        select: ['id', 'subscriptionPlan'],
      })) as { subscriptionPlan?: string } | null
      const planDoc = (await (strapi.documents as any)(
        'api::subscription-plan.subscription-plan'
      ).findFirst({
        filters: { code: { $eq: fullUser?.subscriptionPlan ?? 'free' } },
        fields: ['resumesLimit'],
      })) as { resumesLimit: number } | null
      const resumesLimit = planDoc?.resumesLimit ?? 1

      const resumesCount = (await (strapi.documents as any)('api::resume.resume').count({
        filters: {
          user: { id: { $eq: user.id } },
          moderationStatus: { $notIn: ['archived', 'rejected'] },
        },
      })) as number

      if (resumesCount >= resumesLimit) {
        notifyLimitReached(strapi, user.id, 'resumes')
        return ctx.send(
          {
            error: {
              code: 'LIMIT_REACHED',
              message: 'Resume limit reached',
              details: { limit: resumesLimit, used: resumesCount },
            },
          },
          403
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
        salaryTo,
        currency,
        page = '1',
        pageSize = '20',
      } = rawQuery as Record<string, string>

      const workFormats = toArray(rawQuery.workFormat)
      const employmentTypes = toArray(rawQuery.employmentType)
      const skills = toArray(rawQuery.skills)
      const languages = toArray(rawQuery.languages)

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))

      // Pre-query JSON array filters: workFormat/employmentType/skills — простые строки,
      // languages — массив объектов [{lang, level}] → отдельный запрос
      let jsonFilterIds: string[] | null = null
      if (workFormats.length > 0 || employmentTypes.length > 0 || skills.length > 0) {
        jsonFilterIds = await svc().getIdsByJsonArrayFilters({
          ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
          ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
          ...(skills.length > 0 ? { skills } : {}),
        })
        if (jsonFilterIds.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }
      }

      if (languages.length > 0) {
        const langIds = await svc().getIdsByLanguageObjects(languages)
        if (langIds.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }
        jsonFilterIds =
          jsonFilterIds === null ? langIds : jsonFilterIds.filter((id) => new Set(langIds).has(id))
        if (jsonFilterIds.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }
      }

      // Block filter: hide resumes of users the current user has blocked
      let blockedUserIds: number[] = []
      if (ctx.state.user) {
        const blocked = await getBlockedIds(strapi, (ctx.state.user as { id: number }).id)
        blockedUserIds = blocked.userIds
      }

      const filters: Record<string, unknown> = { moderationStatus: { $eq: 'published' } }

      if (blockedUserIds.length > 0) {
        filters.user = { id: { $notIn: blockedUserIds } }
      }
      if (jsonFilterIds !== null) filters.documentId = { $in: jsonFilterIds }
      if (country) filters.country = { $eq: country }
      if (city) filters.city = { $containsi: city }
      if (experienceYears) {
        const years = parseInt(experienceYears, 10)
        if (!isNaN(years)) filters.experienceYears = { $lte: years }
      }
      if (salaryTo) {
        const salary = parseInt(salaryTo, 10)
        if (!isNaN(salary)) filters.desiredSalary = { $lte: salary }
      }
      if (currency) filters.currency = { $eq: currency }
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

      // Block-фильтр: если viewer заблокировал автора резюме — прикидываемся 404
      // (иначе через прямую ссылку можно обходить фильтр /resumes list).
      if (!isOwner && resumeOwnerId) {
        const { userIds } = await getBlockedIds(strapi, requestUser.id)
        if (userIds.includes(resumeOwnerId)) {
          return ctx.notFound('Resume not found')
        }
      }

      // Resume database is a Max/VIP feature, but employers can always view resumes
      // of candidates who applied to their vacancies (regardless of plan)
      if (!isOwner) {
        const incomingApplication = await strapi.db.query('api::application.application').findOne({
          where: {
            resume: { documentId: id },
            vacancy: { postedBy: { id: requestUser.id } },
          },
          select: ['id'],
        })
        const hasIncomingApplication = Boolean(incomingApplication)

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
      const ip = ctx.request.ip ?? 'unknown'
      let newViews = resume.views ?? 0
      let newUniqueViews = resume.uniqueViews ?? 0
      if (!isOwner) {
        newViews += 1
        const unique = isUniqueViewIP(id, ip)
        if (unique) newUniqueViews += 1
        recordViewIP(id, ip)

        await (strapi.documents as any)('api::resume.resume').update({
          documentId: id,
          data: { views: newViews, uniqueViews: newUniqueViews },
        })

        if (resumeOwnerId && shouldNotifyViewer(id, requestUser.id)) {
          void sendNotification(strapi, {
            userId: resumeOwnerId,
            type: 'resume_viewed',
            templateData: {
              resumeTitle: resume.title ?? '',
              resumeId: id,
            },
          })
        }
      }

      let contacts: unknown = null

      if (requestUser) {
        if (isOwner) {
          contacts = resume.contacts
        } else {
          // Бизнес-правило: работодатель видит контакты кандидата сразу при
          // получении отклика (любой статус)
          const revealingApplication = await strapi.db
            .query('api::application.application')
            .findOne({
              where: {
                user: { id: resumeOwnerId },
                vacancy: { postedBy: { id: requestUser.id } },
              },
              select: ['id'],
            })
          if (revealingApplication) contacts = (resume as any).contacts
        }
      }

      return ctx.send({
        data: { ...resume, views: newViews, uniqueViews: newUniqueViews, contacts },
      })
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

      for (const field of ['title', 'firstName', 'lastName', 'country', 'city'] as const) {
        if (field in updateData) {
          const err = validateShortText(field, updateData[field])
          if (err) return ctx.badRequest(err)
        }
      }
      if ('about' in updateData) {
        const err = validateLongText('about', updateData.about)
        if (err) return ctx.badRequest(err)
      }
      if ('desiredSalary' in updateData) {
        const err = validateSalaryRange(updateData.desiredSalary, updateData.desiredSalary)
        if (err) return ctx.badRequest(err)
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

    async invite(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const viewer = (await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        select: ['id', 'subscriptionPlan'],
      })) as { subscriptionPlan: string } | null
      if (!viewer || !checkIsMaxPlan(viewer)) {
        return ctx.send(
          {
            error: {
              code: 'SUBSCRIPTION_REQUIRED',
              message: 'Max subscription plan required to invite candidates',
            },
          },
          403
        )
      }

      const { id } = ctx.params as { id: string }
      const body = ctx.request.body as { vacancyId?: string }
      if (!body.vacancyId) return ctx.badRequest('vacancyId is required')

      const resume = await (strapi.documents as any)('api::resume.resume').findOne({
        documentId: id,
        fields: ['documentId', 'title', 'moderationStatus', 'invitations'],
        populate: { user: { fields: ['id'] } },
      })
      if (!resume || resume.moderationStatus !== 'published') {
        return ctx.notFound('Resume not found')
      }
      const resumeOwnerId = resume.user?.id as number | undefined
      if (!resumeOwnerId) return ctx.badRequest('Resume has no owner')
      if (resumeOwnerId === user.id) {
        return ctx.badRequest('Cannot invite yourself')
      }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: body.vacancyId,
        fields: ['documentId', 'title', 'moderationStatus'],
        populate: {
          postedBy: { fields: ['id'] },
          company: { fields: ['name'] },
        },
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')
      if ((vacancy as any).postedBy?.id !== user.id) {
        return ctx.forbidden('You do not own this vacancy')
      }
      if ((vacancy as any).moderationStatus !== 'published') {
        return ctx.badRequest('Vacancy must be published to invite candidates')
      }

      // Дедуп: одна и та же вакансия не должна приглашать того же кандидата дважды.
      // Ищем уже созданное invitation_to_apply в уведомлениях получателя.
      const dedupCheck = (await strapi.db.connection.raw(
        `SELECT n.id FROM notifications n
         INNER JOIN notifications_user_lnk lnk ON lnk.notification_id = n.id
         WHERE lnk.user_id = ?
           AND n.type = 'invitation_to_apply'
           AND n.data::jsonb @> ?::jsonb
         LIMIT 1`,
        [resumeOwnerId, JSON.stringify({ entityId: body.vacancyId })]
      )) as { rows: unknown[] }
      if (dedupCheck.rows.length > 0) {
        return ctx.send(
          {
            error: {
              code: 'ALREADY_INVITED',
              message: 'Candidate has already been invited to this vacancy',
            },
          },
          409
        )
      }

      // Инкрементируем счётчик приглашений на резюме (для аналитики)
      await strapi.db.connection.raw(
        `UPDATE resumes SET invitations = COALESCE(invitations, 0) + 1 WHERE document_id = ?`,
        [id]
      )

      const companyName = (vacancy as any).company?.name as string | undefined
      await sendNotification(strapi, {
        userId: resumeOwnerId,
        type: 'invitation_to_apply',
        templateData: {
          vacancyTitle: (vacancy as any).title ?? '',
          vacancyId: body.vacancyId,
          companyName: companyName ?? '',
        },
      })

      return ctx.send({ data: { success: true } })
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
