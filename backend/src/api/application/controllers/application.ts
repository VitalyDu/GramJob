import type { Core } from '@strapi/strapi'
import { canTransitionTo, canViewApplication } from '../services/application-utils'
import {
  checkAndConsumeApplyCredit,
  refundApplyCredit,
  type ConsumedApplySource,
} from '../services/apply-credit-service'
import { notifyLimitReached } from '../../../services/limit-notify'

const APPLICATION_POPULATE = {
  vacancy: {
    fields: ['documentId', 'title', 'moderationStatus', 'sourceType'],
    populate: {
      company: { fields: ['documentId', 'name', 'slug', 'telegram'] },
      // telegramId + name постящего работодателя — раскрываются кандидату только
      // при статусе interview+ (см. attachEmployerContacts ниже). Для employer-эндпоинтов
      // это его же данные, не проблема.
      postedBy: { fields: ['id', 'firstName', 'lastName', 'telegramId'] },
    },
  },
  resume: {
    // contacts безопасны во всех эндпоинтах: резюме принадлежит кандидату
    // отклика, а видят отклик только сам кандидат и владелец вакансии
    fields: ['documentId', 'title', 'firstName', 'lastName', 'moderationStatus', 'contacts'],
    populate: { user: { fields: ['id'] } },
  },
  user: { fields: ['id', 'firstName', 'lastName'] },
} as const

// Спека §8: «После одобрения отклика кандидат получает контакты, Telegram работодателя».
// Раскрываем telegramId постящего пользователя, начиная со статуса interview
// (первое действие работодателя, требующее реального контакта с кандидатом).
const CONTACTS_REVEALING_STATUSES = new Set(['interview', 'test-task', 'offer', 'hired'])

function maskEmployerTelegram(application: any, viewerId: number | undefined): any {
  if (!application) return application
  const isCandidate = application.user?.id === viewerId
  const isEmployer = application.vacancy?.postedBy?.id === viewerId
  const status = application.status as string | undefined
  // Employer видит собственные данные и без маски. Candidate — только на interview+.
  if (isEmployer) return application
  if (isCandidate && status && CONTACTS_REVEALING_STATUSES.has(status)) return application

  const postedBy = application.vacancy?.postedBy
  if (postedBy) {
    return {
      ...application,
      vacancy: {
        ...application.vacancy,
        postedBy: { id: postedBy.id },
      },
    }
  }
  return application
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { vacancyId, resumeId, coverLetter } = body

    if (!vacancyId || !resumeId) {
      return ctx.badRequest('vacancyId and resumeId are required')
    }

    // Validate vacancy is published and internal
    const vacancy = await (strapi.documents as any)('api::vacancy.vacancy').findOne({
      documentId: vacancyId as string,
      fields: ['documentId', 'moderationStatus', 'sourceType'],
      populate: { postedBy: { fields: ['id'] } },
    })
    if (!vacancy) return ctx.notFound('Vacancy not found')
    if (vacancy.moderationStatus !== 'published') {
      return ctx.badRequest('Vacancy is not published')
    }
    if (vacancy.sourceType === 'external') {
      return ctx.badRequest('Cannot apply to external vacancies through this endpoint')
    }

    // Validate resume ownership and published status
    const resume = await (strapi.documents as any)('api::resume.resume').findOne({
      documentId: resumeId as string,
      fields: ['documentId', 'moderationStatus'],
      populate: { user: { fields: ['id'] } },
    })
    if (!resume) return ctx.notFound('Resume not found')
    if (resume.user?.id !== user.id) {
      return ctx.forbidden('You do not own this resume')
    }
    if (resume.moderationStatus !== 'published') {
      return ctx.badRequest('Resume must be published to apply')
    }

    // Enforce one application per vacancy per user
    const existing = await (strapi.documents as any)('api::application.application').findFirst({
      filters: {
        vacancy: { documentId: { $eq: vacancyId as string } },
        user: { id: { $eq: user.id } },
      },
    })
    if (existing) {
      return ctx.send(
        {
          error: { code: 'ALREADY_APPLIED', message: 'You have already applied to this vacancy' },
        },
        409
      )
    }

    // Check and consume apply credit
    let consumedSource: ConsumedApplySource
    try {
      consumedSource = await checkAndConsumeApplyCredit(strapi, user.id)
    } catch (err: any) {
      if (err?.code === 'LIMIT_REACHED') {
        notifyLimitReached(strapi, user.id, 'daily_applications')
        return ctx.send(
          {
            error: {
              code: 'LIMIT_REACHED',
              message: 'Daily application limit reached',
              details: err.details,
            },
          },
          403
        )
      }
      throw err
    }

    let application: unknown
    try {
      application = await (strapi.documents as any)('api::application.application').create({
        data: {
          vacancy: vacancyId as string,
          resume: resumeId as string,
          user: user.id,
          coverLetter: coverLetter as string | undefined,
          status: 'applied',
        },
        populate: APPLICATION_POPULATE as any,
      })
    } catch (err) {
      // The credit must not burn if the application row was never created
      await refundApplyCredit(strapi, user.id, consumedSource).catch(() => {})
      throw err
    }

    // Increment applicationsCount directly — lifecycle result in Strapi 5
    // does not reliably populate relations, so we use the documentId we already have
    try {
      await strapi.db.connection.raw(
        `UPDATE vacancies SET applications_count = applications_count + 1 WHERE document_id = ?`,
        [vacancyId as string]
      )
    } catch {
      strapi.log.warn(
        `[application] Failed to increment applicationsCount for vacancy ${vacancyId}`
      )
    }

    return ctx.send({ data: application }, 201)
  },

  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { status, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
    if (status) filters.status = { $eq: status }

    const [applications, total] = await Promise.all([
      (strapi.documents as any)('api::application.application').findMany({
        filters,
        populate: APPLICATION_POPULATE as any,
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::application.application').count({ filters }),
    ])

    return ctx.send({
      data: applications.map((a: any) => maskEmployerTelegram(a, user.id)),
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async findOne(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const application = await (strapi.documents as any)('api::application.application').findOne({
      documentId: id,
      populate: APPLICATION_POPULATE as any,
    })
    if (!application) return ctx.notFound('Application not found')
    if (!canViewApplication(application, user.id)) {
      return ctx.forbidden('You do not have access to this application')
    }

    ctx.body = { data: maskEmployerTelegram(application, user.id) }
  },

  async findByVacancy(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const { status, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    // Verify the requesting user owns the vacancy
    const vacancy = await (strapi.documents as any)('api::vacancy.vacancy').findOne({
      documentId: id,
      fields: ['documentId'],
      populate: { postedBy: { fields: ['id'] } },
    })
    if (!vacancy) return ctx.notFound('Vacancy not found')
    if (vacancy.postedBy?.id !== user.id) {
      return ctx.forbidden('You do not own this vacancy')
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = {
      vacancy: { documentId: { $eq: id } },
    }
    if (status) filters.status = { $eq: status }

    const [applications, total] = await Promise.all([
      (strapi.documents as any)('api::application.application').findMany({
        filters,
        populate: APPLICATION_POPULATE as any,
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::application.application').count({ filters }),
    ])

    return ctx.send({
      data: applications.map((a: any) => maskEmployerTelegram(a, user.id)),
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async updateStatus(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const body = ctx.request.body as { status?: string }

    if (!body.status) return ctx.badRequest('status is required')

    const application = await (strapi.documents as any)('api::application.application').findOne({
      documentId: id,
      populate: APPLICATION_POPULATE as any,
    })
    if (!application) return ctx.notFound('Application not found')

    // Only the vacancy owner (employer) may change status
    if (application.vacancy?.postedBy?.id !== user.id) {
      return ctx.forbidden('Only the vacancy owner can update application status')
    }

    const currentStatus = application.status as string
    if (!canTransitionTo(currentStatus, body.status)) {
      return ctx.badRequest(
        `Cannot transition application status from "${currentStatus}" to "${body.status}"`
      )
    }

    const updated = await (strapi.documents as any)('api::application.application').update({
      documentId: id,
      data: { status: body.status as any },
      populate: APPLICATION_POPULATE as any,
    })

    return ctx.send({ data: maskEmployerTelegram(updated, user.id) })
  },
})
