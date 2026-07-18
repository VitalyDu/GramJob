import type { Core } from '@strapi/strapi'

function clampDate(input: string | undefined, fallbackDaysAgo: number): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - fallbackDaysAgo)
  return d.toISOString().slice(0, 10)
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async vacancyAnalytics(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const { from, to } = ctx.query as Record<string, string>

    const fromDate = clampDate(from, 30)
    const toDate = clampDate(to, 0)

    const vacancy = await (strapi.documents as any)('api::vacancy.vacancy').findOne({
      documentId: id,
      populate: { postedBy: { fields: ['id'] } },
      fields: ['documentId', 'title'],
    })

    if (!vacancy) return ctx.notFound('Vacancy not found')
    if (vacancy.postedBy?.id !== user.id) return ctx.forbidden('Not your vacancy')

    const records = (await strapi.db.query('api::vacancy-analytics.vacancy-analytics').findMany({
      where: {
        vacancy: { documentId: id },
        date: { $gte: fromDate, $lte: toDate },
      },
      orderBy: { date: 'asc' },
      select: ['date', 'views', 'uniqueViews', 'applications', 'ctr'],
    })) as Array<{
      date: string
      views: number
      uniqueViews: number
      applications: number
      ctr: number
    }>

    const totalViews = records.reduce((s, r) => s + r.views, 0)
    const totalUnique = records.reduce((s, r) => s + r.uniqueViews, 0)
    const totalApps = records.reduce((s, r) => s + r.applications, 0)

    ctx.send({
      total: {
        views: totalViews,
        uniqueViews: totalUnique,
        applications: totalApps,
        ctr: totalUnique > 0 ? Math.round((totalApps / totalUnique) * 100 * 10) / 10 : 0,
      },
      daily: records,
    })
  },

  async resumeAnalytics(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const { from, to } = ctx.query as Record<string, string>

    const fromDate = clampDate(from, 30)
    const toDate = clampDate(to, 0)

    const resume = await (strapi.documents as any)('api::resume.resume').findOne({
      documentId: id,
      populate: { user: { fields: ['id'] } },
      fields: ['documentId', 'title'],
    })

    if (!resume) return ctx.notFound('Resume not found')
    if (resume.user?.id !== user.id) return ctx.forbidden('Not your resume')

    const records = (await strapi.db.query('api::resume-analytics.resume-analytics').findMany({
      where: {
        resume: { documentId: id },
        date: { $gte: fromDate, $lte: toDate },
      },
      orderBy: { date: 'asc' },
      select: ['date', 'views', 'uniqueViews', 'invitations'],
    })) as Array<{ date: string; views: number; uniqueViews: number; invitations: number }>

    ctx.send({
      total: {
        views: records.reduce((s, r) => s + r.views, 0),
        uniqueViews: records.reduce((s, r) => s + r.uniqueViews, 0),
        invitations: records.reduce((s, r) => s + r.invitations, 0),
      },
      daily: records,
    })
  },

  async companyAnalytics(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }

    const company = (await (strapi.documents as any)('api::company.company').findOne({
      documentId: id,
      populate: { owner: { fields: ['id'] } },
      fields: ['documentId', 'views', 'uniqueViews'],
    })) as { views: number; uniqueViews: number; owner?: { id: number } } | null

    if (!company) return ctx.notFound('Company not found')
    if (company.owner?.id !== user.id) return ctx.forbidden('Not your company')

    const [vacanciesCount, applicationsCount] = await Promise.all([
      strapi.documents('api::vacancy.vacancy').count({
        filters: {
          company: { documentId: { $eq: id } },
          moderationStatus: { $eq: 'published' },
        },
      }),
      strapi.db.query('api::application.application').count({
        where: {
          vacancy: { company: { documentId: id } },
        },
      }),
    ])

    ctx.send({
      total: {
        views: company.views ?? 0,
        uniqueViews: company.uniqueViews ?? 0,
        vacanciesCount,
        applicationsCount,
      },
    })
  },
})
