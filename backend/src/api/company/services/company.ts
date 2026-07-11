import type { Core } from '@strapi/strapi'
import { toSlug } from './company-utils'

type CreateCompanyInput = {
  name: string
  description: string
  country: string
  companySize: string
  city?: string
  website?: string
  telegram?: string
  linkedin?: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createCompany(ownerId: number, input: CreateCompanyInput) {
    const baseSlug = toSlug(input.name)
    const slug = await generateUniqueSlug(strapi, baseSlug)

    return strapi.documents('api::company.company').create({
      data: {
        name: input.name,
        description: input.description,
        country: input.country,
        companySize: input.companySize as
          | 'size_1_10'
          | 'size_11_50'
          | 'size_51_200'
          | 'size_201_500'
          | 'size_500_plus',
        city: input.city,
        website: input.website,
        telegram: input.telegram,
        linkedin: input.linkedin,
        slug,
        moderationStatus: 'draft',
        owner: ownerId,
      },
    })
  },

  async generateUniqueSlug(base: string, excludeDocumentId?: string): Promise<string> {
    return generateUniqueSlug(strapi, base, excludeDocumentId)
  },
})

async function generateUniqueSlug(
  strapi: Core.Strapi,
  base: string,
  excludeDocumentId?: string
): Promise<string> {
  let slug = base
  let attempt = 0

  while (true) {
    const existing = await strapi.documents('api::company.company').findFirst({
      filters: { slug: { $eq: slug } },
      fields: ['documentId'],
    })

    if (!existing || existing.documentId === excludeDocumentId) return slug

    attempt++
    slug = `${base}-${attempt}`
  }
}
