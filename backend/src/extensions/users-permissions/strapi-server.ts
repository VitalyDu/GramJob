// Extension for @strapi/plugin-users-permissions
// - GET /users/me: strips sensitive fields, ensures custom fields are included
// - PUT /users/me: allowlist-only field updates (firstName, lastName, language, avatar)

import { isAllowedAvatarUrl } from '../../services/avatar-utils'

const SAFE_RESPONSE_FIELDS = [
  'id',
  'email',
  'telegramId',
  'firstName',
  'lastName',
  'avatar',
  'language',
  'subscriptionPlan',
  'subscriptionExpiresAt',
  'vacancyCredits',
  'applyCredits',
  'boostCredits',
  'isVip',
  'telegramNotificationsEnabled',
  'createdAt',
] as const

const ALLOWED_UPDATE_FIELDS = [
  'firstName',
  'lastName',
  'language',
  'avatar',
  'telegramNotificationsEnabled',
] as const

// Action uid used by the scope generator: plugin::users-permissions.user.updateMe
const UPDATE_ME_ACTION = 'plugin::users-permissions.user.updateMe'

function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[]
): Partial<T> {
  const result: Partial<T> = {}
  for (const field of fields) {
    if (field in obj) {
      ;(result as Record<string, unknown>)[field] = obj[field]
    }
  }
  return result
}

export default (plugin: any) => {
  // Override POST /auth/local/register — auto-set username from email, accept firstName/lastName
  // plugin.controllers.auth is a factory ({ strapi }) => ({ register, ... }), so wrap the factory
  const originalAuthFactory = plugin.controllers.auth
  plugin.controllers.auth = (opts: any) => {
    const controller = originalAuthFactory(opts)
    const originalRegister = controller.register
    controller.register = async (ctx: any) => {
      const body = ctx.request.body ?? {}
      if (!body.username && body.email) {
        ctx.request.body = { ...body, username: (body.email as string).toLowerCase() }
      }
      return originalRegister(ctx)
    }
    return controller
  }

  // Override GET /users/me — ensure custom fields are returned and sensitive ones stripped
  const originalMe = plugin.controllers.user.me
  plugin.controllers.user.me = async (ctx: any) => {
    await originalMe(ctx)
    if (ctx.body && typeof ctx.body === 'object') {
      ctx.body = pickFields(ctx.body as Record<string, unknown>, SAFE_RESPONSE_FIELDS)
    }
  }

  // Add PUT /users/me — allowlist field updates only
  plugin.controllers.user.updateMe = async (ctx: any) => {
    const authUser = ctx.state.user
    if (!authUser) {
      return ctx.unauthorized()
    }

    const body = (ctx.request.body ?? {}) as Record<string, unknown>
    const safeData = pickFields(body, ALLOWED_UPDATE_FIELDS)

    if ('avatar' in safeData && !isAllowedAvatarUrl(safeData.avatar)) {
      return ctx.badRequest('avatar must be a URL from the uploads storage or Telegram')
    }

    // Use db.query for the update (resolves numeric id directly)
    const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: authUser.id },
      data: safeData,
      select: [...SAFE_RESPONSE_FIELDS],
    })

    ctx.body = updatedUser
  }

  // Add PUT /users/me route — must come before PUT /users/:id to avoid id-capture
  const contentApiRoutes: any[] = plugin.routes?.['content-api']?.routes ?? []

  // Check if a PUT /users/me route already exists (avoid duplicate)
  const existingPutMe = contentApiRoutes.find(
    (r: any) => r.method === 'PUT' && r.path === '/users/me'
  )

  if (!existingPutMe) {
    // Prepend so it matches before PUT /users/:id
    contentApiRoutes.unshift({
      method: 'PUT',
      path: '/users/me',
      handler: 'user.updateMe',
      config: {
        prefix: '',
      },
    })
  } else {
    existingPutMe.handler = 'user.updateMe'
  }

  // Hook into bootstrap to grant the updateMe permission to the authenticated role.
  // The scope generator assigns plugin::users-permissions.user.updateMe as the required
  // action. syncPermissions() only creates default permissions on first run, so new
  // actions must be seeded explicitly.
  const originalBootstrap = plugin.bootstrap
  plugin.bootstrap = async (ctx: any) => {
    if (originalBootstrap) {
      await originalBootstrap(ctx)
    }

    const { strapi: strapiInstance } = ctx

    const authenticatedRole = await strapiInstance.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } })

    if (!authenticatedRole) return

    const existing = await strapiInstance.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action: UPDATE_ME_ACTION, role: authenticatedRole.id } })

    if (!existing) {
      await strapiInstance.db.query('plugin::users-permissions.permission').create({
        data: {
          action: UPDATE_ME_ACTION,
          role: authenticatedRole.id,
        },
      })
    }
  }

  return plugin
}
