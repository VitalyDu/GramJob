import type { Core } from '@strapi/strapi'

const AUTHENTICATED_PERMISSIONS = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.user.update',
  'api::company.company.create',
  'api::company.company.findMine',
  'api::company.company.findMineById',
  'api::company.company.update',
  'api::company.company.delete',
  'api::company.company.submit',
  'api::vacancy.vacancy.create',
  'api::vacancy.vacancy.findMine',
  'api::vacancy.vacancy.findMineById',
  'api::vacancy.vacancy.update',
  'api::vacancy.vacancy.publish',
  'api::vacancy.vacancy.boost',
  'api::vacancy.vacancy.archive',
  'api::vacancy.vacancy.delete',
  'api::vacancy.vacancy.findPublished',
  'api::vacancy.vacancy.findOne',
  'api::resume.resume.create',
  'api::resume.resume.findMine',
  'api::resume.resume.update',
  'api::resume.resume.publish',
  'api::resume.resume.archive',
  'api::resume.resume.findPublic',
  'api::resume.resume.findOne',
  'api::application.application.create',
  'api::application.application.findMine',
  'api::application.application.findByVacancy',
  'api::application.application.updateStatus',
  'api::favorite.favorite.find',
  'api::favorite.favorite.create',
  'api::favorite.favorite.delete',
  'api::saved-search.saved-search.find',
  'api::saved-search.saved-search.create',
  'api::saved-search.saved-search.delete',
  'api::block.block.find',
  'api::block.block.create',
  'api::block.block.delete',
  'api::report.report.create',
  'api::subscription-plan.subscription-plan.find',
  'api::vacancy-package.vacancy-package.find',
  'api::apply-package.apply-package.find',
  'api::payment.payment.subscribe',
  'api::payment.payment.buyVacancyPack',
  'api::payment.payment.buyApplyPack',
]

const PUBLIC_PERMISSIONS = [
  'plugin::users-permissions.auth.callback',
  'plugin::users-permissions.auth.connect',
  'plugin::users-permissions.auth.emailConfirmation',
  'plugin::users-permissions.auth.forgotPassword',
  'plugin::users-permissions.auth.localRegister',
  'plugin::users-permissions.auth.login',
  'plugin::users-permissions.auth.register',
  'plugin::users-permissions.auth.resetPassword',
  'plugin::users-permissions.auth.sendEmailConfirmation',
  'api::company.company.findPublished',
  'api::company.company.findOne',
  'api::company.company.findBySlug',
  'api::vacancy.vacancy.findPublished',
  'api::vacancy.vacancy.findOne',
  'api::resume.resume.findPublic',
  'api::resume.resume.findOne',
  'api::industry.industry.find',
  'api::industry.industry.findOne',
  'api::specialization.specialization.find',
  'api::specialization.specialization.findOne',
  'api::subscription-plan.subscription-plan.find',
  'api::vacancy-package.vacancy-package.find',
  'api::apply-package.apply-package.find',
  'api::payment.payment.handleWebhook',
]

async function ensurePermissions(
  strapi: Core.Strapi,
  roleId: number,
  actions: string[]
): Promise<number> {
  const existing: Array<{ id: number; action: string; enabled: boolean }> = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({
      where: { role: roleId },
    })

  const existingMap = new Map(existing.map((p) => [p.action, p]))
  let count = 0

  for (const action of actions) {
    const perm = existingMap.get(action)
    if (!perm) {
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, role: roleId, enabled: true },
      })
      count++
    } else if (!perm.enabled) {
      await strapi.db.query('plugin::users-permissions.permission').update({
        where: { id: perm.id },
        data: { enabled: true },
      })
      count++
    }
  }

  return count
}

export async function seedPermissions(strapi: Core.Strapi) {
  const roleService = strapi.plugin('users-permissions').service('role')
  const roles: Array<{ id: number; type: string }> = await roleService.find()

  const authenticatedRole = roles.find((r) => r.type === 'authenticated')
  const publicRole = roles.find((r) => r.type === 'public')

  if (!authenticatedRole || !publicRole) {
    strapi.log.warn('[permissions] Could not find authenticated/public roles, skipping')
    return
  }

  const total =
    (await ensurePermissions(strapi, authenticatedRole.id, AUTHENTICATED_PERMISSIONS)) +
    (await ensurePermissions(strapi, publicRole.id, PUBLIC_PERMISSIONS))

  if (total > 0) {
    strapi.log.info(`[permissions] Seeded ${total} new permission(s)`)
  } else {
    strapi.log.info('[permissions] Permissions already up to date')
  }
}
