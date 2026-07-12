import type { Core } from '@strapi/strapi'

// Публичные маршруты объявлены с auth:false, поэтому Strapi не популяет
// ctx.state.user даже при валидном Bearer-токене. Резолвим пользователя
// вручную, чтобы персональные фильтры (блокировки) работали и там.
export async function resolveOptionalUserId(
  strapi: Core.Strapi,
  ctx: { state?: { user?: { id: number } }; request?: { header?: Record<string, string> } }
): Promise<number | null> {
  if (ctx.state?.user?.id) return ctx.state.user.id
  const authHeader = ctx.request?.header?.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const payload = (await strapi
      .plugin('users-permissions')
      .service('jwt')
      .verify(authHeader.slice('Bearer '.length))) as { id?: number }
    return payload?.id ?? null
  } catch {
    // Невалидный/протухший токен на публичном маршруте — не ошибка, просто аноним
    return null
  }
}
