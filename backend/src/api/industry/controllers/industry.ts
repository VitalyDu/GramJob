import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::industry.industry', ({ strapi }) => ({
  async find(ctx) {
    const industries = await strapi.documents('api::industry.industry').findMany({
      populate: { specializations: true },
      sort: 'slug:asc',
    })
    ctx.send(industries)
  },
}))
