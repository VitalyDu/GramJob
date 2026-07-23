import type { Core } from '@strapi/strapi'

const AUTHENTICATED_PERMISSIONS = [
  'plugin::users-permissions.user.me',
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
  'api::resume.resume.invite',
  'api::application.application.create',
  'api::application.application.findMine',
  'api::application.application.findOne',
  'api::application.application.findByVacancy',
  'api::application.application.updateStatus',
  'api::favorite.favorite.findMine',
  'api::favorite.favorite.create',
  'api::favorite.favorite.remove',
  'api::block.block.findMine',
  'api::block.block.create',
  'api::block.block.remove',
  'api::report.report.create',
  'api::subscription-plan.subscription-plan.find',
  'api::vacancy-package.vacancy-package.find',
  'api::apply-package.apply-package.find',
  'api::payment.payment.subscribe',
  'api::payment.payment.vacancyPack',
  'api::payment.payment.applyPack',
  'api::payment.payment.urgent',
  'api::payment.payment.topPlacement',
  'api::payment.ton-payment.createIntent',
  'api::payment.ton-payment.getIntentStatus',
  'api::notification.notification.findMine',
  'api::notification.notification.markRead',
  'api::notification.notification.markAllRead',
  'api::analytics.analytics.vacancyAnalytics',
  'api::analytics.analytics.resumeAnalytics',
  'api::analytics.analytics.companyAnalytics',
  'plugin::upload.content-api.upload',
  'plugin::users-permissions.auth.changePassword',
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
  'api::industry.industry.find',
  'api::industry.industry.findOne',
  'api::specialization.specialization.find',
  'api::specialization.specialization.findOne',
  'api::subscription-plan.subscription-plan.find',
  'api::vacancy-package.vacancy-package.find',
  'api::apply-package.apply-package.find',
  'api::health.health.check',
]

// Previously seeded permissions that must be revoked (renamed handlers, closed routes)
const REMOVED_PERMISSIONS: Record<'authenticated' | 'public', string[]> = {
  authenticated: [
    'api::payment.payment.buyVacancyPack',
    'api::payment.payment.buyApplyPack',
    'api::saved-search.saved-search.findMine',
    'api::saved-search.saved-search.create',
    'api::saved-search.saved-search.remove',
    // Plugin's stock PUT /users/:id has no ownership check — any authenticated
    // user could update any user (password takeover, credit escalation)
    'plugin::users-permissions.user.update',
  ],
  public: [
    'api::resume.resume.findPublic',
    'api::resume.resume.findOne',
    'api::payment.payment.handleWebhook',
  ],
}

async function removePermissions(
  strapi: Core.Strapi,
  roleId: number,
  actions: string[]
): Promise<number> {
  if (actions.length === 0) return 0
  const removed: Array<{ id: number }> = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { role: roleId, action: { $in: actions } }, select: ['id'] })

  for (const perm of removed) {
    await strapi.db.query('plugin::users-permissions.permission').delete({
      where: { id: perm.id },
    })
  }
  return removed.length
}

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

  const removed =
    (await removePermissions(strapi, authenticatedRole.id, REMOVED_PERMISSIONS.authenticated)) +
    (await removePermissions(strapi, publicRole.id, REMOVED_PERMISSIONS.public))

  if (total > 0 || removed > 0) {
    strapi.log.info(`[permissions] Seeded ${total}, removed ${removed} permission(s)`)
  } else {
    strapi.log.info('[permissions] Permissions already up to date')
  }
}
