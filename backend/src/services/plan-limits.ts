import type { Core } from '@strapi/strapi'

/**
 * Единая точка правды по лимитам подписок.
 * Читает `api::subscription-plan.subscription-plan` из БД (админ может править),
 * кеширует на короткое время (5 минут) и fallback-ит на hardcoded defaults,
 * если запись не найдена или БД временно недоступна.
 */
export interface PlanLimits {
  vacanciesPerMonth: number
  activeVacanciesLimit: number
  vacancyBoostsPerDay: number
  applicationsPerDay: number
  resumesLimit: number
  resumeDatabaseAccess: boolean
}

// Fallback: соответствует seed-subscription-plans.ts. Используется только если
// БД возвращает ничего (первый bootstrap, миграция, connection issue).
export const FALLBACK_PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    vacanciesPerMonth: 3,
    activeVacanciesLimit: 3,
    vacancyBoostsPerDay: 3,
    applicationsPerDay: 3,
    resumesLimit: 1,
    resumeDatabaseAccess: false,
  },
  pro: {
    vacanciesPerMonth: 10,
    activeVacanciesLimit: 10,
    vacancyBoostsPerDay: 10,
    applicationsPerDay: 10,
    resumesLimit: 5,
    resumeDatabaseAccess: false,
  },
  max: {
    vacanciesPerMonth: 50,
    activeVacanciesLimit: 50,
    vacancyBoostsPerDay: 50,
    applicationsPerDay: 50,
    resumesLimit: 20,
    resumeDatabaseAccess: true,
  },
  vip: {
    vacanciesPerMonth: 50,
    activeVacanciesLimit: 50,
    vacancyBoostsPerDay: 50,
    applicationsPerDay: 50,
    resumesLimit: 20,
    resumeDatabaseAccess: true,
  },
}

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { at: number; limits: PlanLimits }>()

/** Только для тестов: очистить cache между кейсами. */
export function _resetPlanLimitsCache(): void {
  cache.clear()
}

function fallback(code: string): PlanLimits {
  return FALLBACK_PLAN_LIMITS[code] ?? FALLBACK_PLAN_LIMITS.free!
}

export async function getPlanLimits(strapi: Core.Strapi, code: string): Promise<PlanLimits> {
  const cached = cache.get(code)
  const now = Date.now()
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.limits
  }

  try {
    const planDoc = (await (strapi.documents as any)(
      'api::subscription-plan.subscription-plan'
    ).findFirst({
      filters: { code: { $eq: code } },
      fields: [
        'vacanciesPerMonth',
        'activeVacanciesLimit',
        'vacancyBoostsPerDay',
        'applicationsPerDay',
        'resumesLimit',
        'resumeDatabaseAccess',
      ],
    })) as Partial<PlanLimits> | null

    if (!planDoc) {
      const limits = fallback(code)
      cache.set(code, { at: now, limits })
      return limits
    }

    const fb = fallback(code)
    const limits: PlanLimits = {
      vacanciesPerMonth: planDoc.vacanciesPerMonth ?? fb.vacanciesPerMonth,
      activeVacanciesLimit: planDoc.activeVacanciesLimit ?? fb.activeVacanciesLimit,
      vacancyBoostsPerDay: planDoc.vacancyBoostsPerDay ?? fb.vacancyBoostsPerDay,
      applicationsPerDay: planDoc.applicationsPerDay ?? fb.applicationsPerDay,
      resumesLimit: planDoc.resumesLimit ?? fb.resumesLimit,
      resumeDatabaseAccess: planDoc.resumeDatabaseAccess ?? fb.resumeDatabaseAccess,
    }
    cache.set(code, { at: now, limits })
    return limits
  } catch (err) {
    strapi.log?.warn?.(`[plan-limits] failed to load plan "${code}", using fallback`, err)
    return fallback(code)
  }
}
