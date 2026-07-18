// Extension for @strapi/plugin-users-permissions
// - GET /users/me: strips sensitive fields, ensures custom fields are included
// - PUT /users/me: allowlist-only field updates (firstName, lastName, language, avatar)
// - GET /users/me/limits: real-time usage limits for all 4 plan bars

import { isAllowedAvatarUrl } from '../../services/avatar-utils'
import { getAppliesUsedToday } from '../../api/application/services/apply-credit-service'
import { stripNullStringFieldsFromBody } from './normalize-user-body'

const SAFE_RESPONSE_FIELDS = [
  'id',
  'email',
  'telegramId',
  'telegramUsername',
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
const MY_LIMITS_ACTION = 'plugin::users-permissions.user.myLimits'

const FREE_PLAN_LIMITS = {
  vacanciesPerMonth: 3,
  activeVacanciesLimit: 3,
  applicationsPerDay: 3,
  resumesLimit: 1,
}

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

  // Strip null email/username/password before Content Manager admin update runs its Yup validator
  // (contentmanageruser.update calls validateUpdateUserBody, which rejects null strings).
  // Telegram-only users have email=null; admin edits must not fail on that.
  if (plugin.controllers.contentmanageruser?.update) {
    const originalCMUUpdate = plugin.controllers.contentmanageruser.update
    plugin.controllers.contentmanageruser.update = async (ctx: any) => {
      stripNullStringFieldsFromBody(ctx.request?.body)
      return originalCMUUpdate(ctx)
    }
  }

  // Same guard for the content-api PUT /users/:id path (plugin.controllers.user.update).
  if (plugin.controllers.user?.update) {
    const originalUserUpdate = plugin.controllers.user.update
    plugin.controllers.user.update = async (ctx: any) => {
      stripNullStringFieldsFromBody(ctx.request?.body)
      return originalUserUpdate(ctx)
    }
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

  // Add GET /users/me/limits — real-time plan usage stats for all 4 limit bars
  plugin.controllers.user.myLimits = async (ctx: any) => {
    const authUser = ctx.state.user as { id: number } | undefined
    if (!authUser) return ctx.unauthorized()

    const userId = authUser.id

    // Get user's plan and credits
    const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['id', 'subscriptionPlan', 'applyCredits', 'vacancyCredits'],
    })) as {
      id: number
      subscriptionPlan: string
      applyCredits: number
      vacancyCredits: number
    } | null
    if (!user) return ctx.notFound()

    // Get plan limits from SubscriptionPlan content type
    const planDoc = (await (strapi.documents as any)(
      'api::subscription-plan.subscription-plan'
    ).findFirst({
      filters: { code: { $eq: user.subscriptionPlan } },
      fields: ['vacanciesPerMonth', 'activeVacanciesLimit', 'applicationsPerDay', 'resumesLimit'],
    })) as {
      vacanciesPerMonth: number
      activeVacanciesLimit: number
      applicationsPerDay: number
      resumesLimit: number
    } | null
    const plan = planDoc ?? FREE_PLAN_LIMITS

    // ── Applications ───────────────────────────────────────────────────────────
    const applyUsedToday = getAppliesUsedToday(userId)
    const applyRemaining = Math.max(plan.applicationsPerDay - applyUsedToday, 0) + user.applyCredits
    const todayStr = new Date().toISOString().slice(0, 10)
    const applyResetsAt = `${todayStr}T23:59:59Z`

    // ── Vacancy creations this month ───────────────────────────────────────────
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const createdThisMonth = (await (strapi.documents as any)('api::vacancy.vacancy').count({
      filters: {
        postedBy: { id: { $eq: userId } },
        moderationStatus: { $in: ['moderation', 'published'] },
        createdAt: { $gte: monthStart.toISOString() },
      },
    })) as number
    const vacancyCreationsRemaining =
      Math.max(plan.vacanciesPerMonth - createdThisMonth, 0) + user.vacancyCredits
    const nextMonth = new Date()
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1)
    nextMonth.setUTCHours(0, 0, 0, 0)
    const vacancyCreationsResetsAt = nextMonth.toISOString()

    // ── Active vacancies ───────────────────────────────────────────────────────
    const activeVacanciesCount = (await (strapi.documents as any)('api::vacancy.vacancy').count({
      filters: {
        postedBy: { id: { $eq: userId } },
        moderationStatus: { $in: ['moderation', 'published'] },
      },
    })) as number
    const activeVacanciesRemaining = Math.max(plan.activeVacanciesLimit - activeVacanciesCount, 0)

    // ── Resumes ────────────────────────────────────────────────────────────────
    const resumesCount = (await (strapi.documents as any)('api::resume.resume').count({
      filters: {
        user: { id: { $eq: userId } },
        moderationStatus: { $notIn: ['archived', 'rejected'] },
      },
    })) as number
    const resumesRemaining = Math.max(plan.resumesLimit - resumesCount, 0)

    ctx.body = {
      applications: {
        remaining: applyRemaining,
        limit: plan.applicationsPerDay,
        resetsAt: applyResetsAt,
      },
      resumes: {
        remaining: resumesRemaining,
        limit: plan.resumesLimit,
      },
      vacancyCreations: {
        remaining: vacancyCreationsRemaining,
        limit: plan.vacanciesPerMonth,
        resetsAt: vacancyCreationsResetsAt,
      },
      activeVacancies: {
        remaining: activeVacanciesRemaining,
        limit: plan.activeVacanciesLimit,
      },
    }
  }

  // Add PUT /users/me route — must come before PUT /users/:id to avoid id-capture
  const contentApiRoutes: any[] = plugin.routes?.['content-api']?.routes ?? []

  // GET /users/me/limits — must be before GET /users/me to avoid :id capture
  const existingLimits = contentApiRoutes.find(
    (r: any) => r.method === 'GET' && r.path === '/users/me/limits'
  )
  if (!existingLimits) {
    contentApiRoutes.unshift({
      method: 'GET',
      path: '/users/me/limits',
      handler: 'user.myLimits',
      config: { prefix: '' },
    })
  }

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

  // Hook into bootstrap to grant the updateMe and myLimits permissions to the authenticated role.
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

    for (const action of [UPDATE_ME_ACTION, MY_LIMITS_ACTION]) {
      const existing = await strapiInstance.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: authenticatedRole.id } })

      if (!existing) {
        await strapiInstance.db.query('plugin::users-permissions.permission').create({
          data: {
            action,
            role: authenticatedRole.id,
          },
        })
      }
    }
  }

  return plugin
}
