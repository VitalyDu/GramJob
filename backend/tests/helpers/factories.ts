import type { Core } from '@strapi/strapi'

export async function createTestUser(
  strapi: Core.Strapi,
  overrides: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } })

  // Use the plugin's add() service — it handles password hashing internally via Document Service
  const user = await strapi
    .plugin('users-permissions')
    .service('user')
    .add({
      email: `test_${Date.now()}@gramjob.com`,
      username: `testuser_${Date.now()}`,
      password: 'Test1234!',
      confirmed: true,
      blocked: false,
      role: role?.id,
      subscriptionPlan: 'free',
      vacancyCredits: 0,
      applyCredits: 0,
      language: 'ru',
      ...overrides,
    })

  // add() returns a Document Service result with documentId; resolve numeric id via db
  if (!user.id) {
    const dbUser = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { documentId: user.documentId } })
    return { ...user, id: dbUser?.id }
  }
  return user
}

export function issueJwt(strapi: Core.Strapi, userId: number): string {
  return strapi.plugin('users-permissions').service('jwt').issue({ id: userId })
}
