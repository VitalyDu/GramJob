import type { Core } from '@strapi/strapi'
import { INDUSTRIES_SEED } from '../data/industries'

export async function seedIndustries(strapi: Core.Strapi): Promise<void> {
  let industriesCreated = 0
  let specsCreated = 0

  for (const industry of INDUSTRIES_SEED) {
    const existingIndustry = await strapi.documents('api::industry.industry').findFirst({
      filters: { slug: { $eq: industry.slug } },
    })

    const industryDoc =
      existingIndustry ??
      (await strapi.documents('api::industry.industry').create({
        data: { name: industry.name, slug: industry.slug },
      }))

    if (!existingIndustry) industriesCreated++

    for (const spec of industry.specializations) {
      const existingSpec = await strapi
        .documents('api::specialization.specialization')
        .findFirst({ filters: { slug: { $eq: spec.slug } } })

      if (!existingSpec) {
        await strapi.documents('api::specialization.specialization').create({
          data: { name: spec.name, slug: spec.slug, industry: industryDoc.documentId },
        })
        specsCreated++
      }
    }
  }

  if (industriesCreated > 0 || specsCreated > 0) {
    strapi.log.info(
      `Seed complete: ${industriesCreated} industries created, ${specsCreated} specializations created`
    )
  }
}
