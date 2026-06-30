import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAll(ctx: any) {
    const packages = await (strapi.documents as any)(
      'api::vacancy-package.vacancy-package'
    ).findMany({
      fields: ['id', 'name', 'vacancyCredits', 'boostCredits', 'starsPrice'],
      sort: [{ starsPrice: 'asc' }],
    })
    ctx.body = { data: packages }
  },
})
