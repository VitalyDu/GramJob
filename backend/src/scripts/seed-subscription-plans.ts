import type { Core } from '@strapi/strapi'

type PlanSeed = {
  code: 'free' | 'pro' | 'max' | 'vip'
  name: string
  vacanciesPerMonth: number
  activeVacanciesLimit: number
  vacancyBoostsPerDay: number
  applicationsPerDay: number
  resumesLimit: number
  resumeDatabaseAccess: boolean
  starsPrice: number | null
  durationDays: number
}

export const SUBSCRIPTION_PLANS_SEED: PlanSeed[] = [
  {
    code: 'free',
    name: 'Free',
    vacanciesPerMonth: 3,
    activeVacanciesLimit: 3,
    vacancyBoostsPerDay: 3,
    applicationsPerDay: 3,
    resumesLimit: 1,
    resumeDatabaseAccess: false,
    starsPrice: null,
    durationDays: 30,
  },
  {
    code: 'pro',
    name: 'Pro',
    vacanciesPerMonth: 10,
    activeVacanciesLimit: 10,
    vacancyBoostsPerDay: 10,
    applicationsPerDay: 10,
    resumesLimit: 5,
    resumeDatabaseAccess: false,
    starsPrice: 299,
    durationDays: 30,
  },
  {
    code: 'max',
    name: 'Max',
    vacanciesPerMonth: 50,
    activeVacanciesLimit: 50,
    vacancyBoostsPerDay: 50,
    applicationsPerDay: 50,
    resumesLimit: 20,
    resumeDatabaseAccess: true,
    starsPrice: 999,
    durationDays: 30,
  },
  {
    code: 'vip',
    name: 'VIP Employer',
    vacanciesPerMonth: 50,
    activeVacanciesLimit: 50,
    vacancyBoostsPerDay: 50,
    applicationsPerDay: 50,
    resumesLimit: 20,
    resumeDatabaseAccess: true,
    starsPrice: 499,
    durationDays: 30,
  },
]

export async function seedSubscriptionPlans(strapi: Core.Strapi): Promise<void> {
  let created = 0
  for (const plan of SUBSCRIPTION_PLANS_SEED) {
    const existing = await (strapi.documents as any)(
      'api::subscription-plan.subscription-plan'
    ).findFirst({
      filters: { code: { $eq: plan.code } },
    })

    if (!existing) {
      await (strapi.documents as any)('api::subscription-plan.subscription-plan').create({
        data: plan,
      })
      created++
    }
  }
  if (created > 0) {
    strapi.log.info(`[seed] Created ${created} subscription plans`)
  }
}
