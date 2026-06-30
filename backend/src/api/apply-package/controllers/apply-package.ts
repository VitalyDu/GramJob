import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAll(ctx: any) {
    const packages = await (strapi.documents as any)('api::apply-package.apply-package').findMany({
      fields: ['id', 'name', 'applyCredits', 'starsPrice'],
      sort: [{ starsPrice: 'asc' }],
    })
    ctx.body = { data: packages }
  },
})
