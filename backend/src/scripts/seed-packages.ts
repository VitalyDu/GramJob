import type { Core } from '@strapi/strapi'

export const VACANCY_PACKAGES_SEED = [
  { name: 'Starter', vacancyCredits: 10, boostCredits: 10, starsPrice: 199 },
  { name: 'Basic', vacancyCredits: 20, boostCredits: 20, starsPrice: 349 },
  { name: 'Pro', vacancyCredits: 50, boostCredits: 50, starsPrice: 749 },
  { name: 'Ultra', vacancyCredits: 100, boostCredits: 100, starsPrice: 1299 },
] as const

export const APPLY_PACKAGES_SEED = [
  { name: 'Starter', applyCredits: 50, starsPrice: 149 },
  { name: 'Pro', applyCredits: 100, starsPrice: 249 },
  { name: 'Ultra', applyCredits: 500, starsPrice: 999 },
] as const

export async function seedPackages(strapi: Core.Strapi): Promise<void> {
  let created = 0

  for (const pkg of VACANCY_PACKAGES_SEED) {
    const existing = await (strapi.documents as any)(
      'api::vacancy-package.vacancy-package'
    ).findFirst({ filters: { name: { $eq: pkg.name } } })

    if (!existing) {
      await (strapi.documents as any)('api::vacancy-package.vacancy-package').create({
        data: pkg,
      })
      created++
    }
  }

  for (const pkg of APPLY_PACKAGES_SEED) {
    const existing = await (strapi.documents as any)('api::apply-package.apply-package').findFirst({
      filters: { name: { $eq: pkg.name } },
    })

    if (!existing) {
      await (strapi.documents as any)('api::apply-package.apply-package').create({
        data: pkg,
      })
      created++
    }
  }

  if (created > 0) {
    strapi.log.info(`[seed] Created ${created} packages (vacancy + apply)`)
  }
}
