import type { Core } from '@strapi/strapi'

export async function createTestUser(
  strapi: Core.Strapi,
  overrides: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } })

  const passwordHash = await strapi
    .plugin('users-permissions')
    .service('user')
    .hashPassword('Test1234!')

  return strapi.db.query('plugin::users-permissions.user').create({
    data: {
      email: `test_${Date.now()}@gramjob.com`,
      username: `testuser_${Date.now()}`,
      password: passwordHash,
      confirmed: true,
      blocked: false,
      role: role?.id,
      subscriptionPlan: 'free',
      vacancyCredits: 0,
      applyCredits: 0,
      language: 'ru',
      ...overrides,
    },
  })
}

export function issueJwt(strapi: Core.Strapi, userId: number): string {
  return strapi.plugin('users-permissions').service('jwt').issue({ id: userId })
}
