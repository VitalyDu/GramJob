import { useTranslation } from 'react-i18next'
import { PLAN_LABELS, getPlanBadgeClasses } from '@/lib/subscription-utils'

interface Props {
  plan: string
  expiresAt?: string | null
  showExpiry?: boolean
}

export function SubscriptionBadge({ plan, expiresAt, showExpiry = false }: Props) {
  const { t, i18n } = useTranslation()
  const label = PLAN_LABELS[plan] ?? plan
  const classes = getPlanBadgeClasses(plan)

  const expiryText =
    showExpiry && expiresAt
      ? new Date(expiresAt).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>{label}</span>
      {expiryText && (
        <span className="text-xs text-muted-foreground">
          {t('subscription.badge.until')} {expiryText}
        </span>
      )}
    </span>
  )
}
