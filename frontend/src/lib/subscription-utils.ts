import i18n from '@/lib/i18n'

export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  max: 'Max',
  vip: 'VIP',
}

export const PLAN_COLORS: Record<string, string> = {
  free: 'gray',
  pro: 'blue',
  max: 'amber',
  vip: 'yellow',
}

export function formatStarsAmount(price: number | null): string | null {
  if (price === null || price === undefined) return null
  return String(price)
}

/** @deprecated Use StarsPrice component for display. Kept for backward compatibility. */
export function formatStarsPrice(price: number | null): string {
  if (price === null || price === undefined) return i18n.t('subscription.starsPrice.free')
  return `${price} ★`
}

export function canUpgradeToPlan(currentPlan: string, targetPlan: string): boolean {
  if (targetPlan === 'free') return false
  if (targetPlan === 'vip') return currentPlan === 'max' || currentPlan === 'vip'
  return true
}

const BADGE_CLASSES: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  max: 'bg-amber-100 text-amber-700',
  vip: 'bg-yellow-100 text-yellow-800',
}

export function getPlanBadgeClasses(plan: string): string {
  return BADGE_CLASSES[plan] ?? BADGE_CLASSES['free']!
}
