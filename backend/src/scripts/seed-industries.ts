import type { Core } from '@strapi/strapi'
import { INDUSTRIES_SEED } from '../data/industries'

export async function seedIndustries(strapi: Core.Strapi): Promise<void> {
  const existing = await strapi.documents('api::industry.industry').count({})
  if (existing > 0) return

  strapi.log.info('Seeding industries and specializations...')

  let totalSpecs = 0
  for (const industry of INDUSTRIES_SEED) {
    const created = await strapi.documents('api::industry.industry').create({
      data: { name: industry.name, slug: industry.slug },
    })

    for (const spec of industry.specializations) {
      await strapi.documents('api::specialization.specialization').create({
        data: {
          name: spec.name,
          slug: spec.slug,
          industry: created.documentId,
        },
      })
      totalSpecs++
    }
  }

  strapi.log.info(
    `Seed complete: ${INDUSTRIES_SEED.length} industries, ${totalSpecs} specializations`
  )
}
