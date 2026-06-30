import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAll(ctx: any) {
    const plans = await (strapi.documents as any)(
      'api::subscription-plan.subscription-plan'
    ).findMany({
      fields: [
        'code',
        'name',
        'vacanciesPerMonth',
        'activeVacanciesLimit',
        'vacancyBoostsPerDay',
        'applicationsPerDay',
        'resumesLimit',
        'resumeDatabaseAccess',
        'starsPrice',
        'durationDays',
      ],
      sort: [{ starsPrice: 'asc' }],
    })
    ctx.body = { data: plans }
  },
})
