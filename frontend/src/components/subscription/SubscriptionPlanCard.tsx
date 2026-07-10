import { useTranslation } from 'react-i18next'
import { getPlanBadgeClasses } from '@/lib/subscription-utils'
import type { SubscriptionPlan } from '@/types/api'
import { Button } from '@/components/ui/button'
import { StarsPrice } from '@/components/subscription/StarsPrice'

interface Props {
  plan: SubscriptionPlan
  currentPlan: string
  canBuy: boolean
  isBuying: boolean
  onBuy: (planCode: string) => void
}

export function SubscriptionPlanCard({ plan, currentPlan, canBuy, isBuying, onBuy }: Props) {
  const { t } = useTranslation()
  const isActive = plan.code === currentPlan
  const badgeClasses = getPlanBadgeClasses(plan.code)

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-4 bg-card ${isActive ? 'border-indigo-400 shadow-md' : 'border-border'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses}`}>
            {plan.name}
          </span>
          {isActive && (
            <span className="ml-2 text-xs text-indigo-600 font-medium">
              {t('subscription.planCard.active')}
            </span>
          )}
        </div>
        <p className="text-base font-bold text-card-foreground">
          <StarsPrice price={plan.starsPrice} />
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>
          {t('subscription.planCard.vacanciesPerMonth')}{' '}
          <span className="font-medium text-card-foreground">{plan.vacanciesPerMonth}</span>
        </li>
        <li>
          {t('subscription.planCard.activeVacancies')}{' '}
          <span className="font-medium text-card-foreground">{plan.activeVacanciesLimit}</span>
        </li>
        <li>
          {t('subscription.planCard.applicationsPerDay')}{' '}
          <span className="font-medium text-card-foreground">{plan.applicationsPerDay}</span>
        </li>
        <li>
          {t('subscription.planCard.resumes')}{' '}
          <span className="font-medium text-card-foreground">{plan.resumesLimit}</span>
        </li>
        <li>
          {t('subscription.planCard.resumeDatabase')}{' '}
          <span
            className={`font-medium ${plan.resumeDatabaseAccess ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            {plan.resumeDatabaseAccess ? '✓' : '✗'}
          </span>
        </li>
      </ul>

      {plan.code === 'vip' && (
        <ul className="space-y-1.5 border-t pt-3 text-sm text-muted-foreground">
          <li>{t('subscription.planCard.vipBenefits.badge')}</li>
          <li>{t('subscription.planCard.vipBenefits.featured')}</li>
          <li>{t('subscription.planCard.vipBenefits.fastModeration')}</li>
          <li>{t('subscription.planCard.vipBenefits.priority')}</li>
        </ul>
      )}

      {plan.code !== 'free' && (
        <Button
          size="sm"
          className="w-full"
          disabled={isActive || !canBuy || isBuying}
          onClick={() => {
            if (!isActive && canBuy) onBuy(plan.code)
          }}
        >
          {isBuying
            ? t('subscription.planCard.creating')
            : isActive
              ? t('subscription.planCard.active')
              : canBuy
                ? t('subscription.planCard.buy')
                : t('subscription.planCard.unavailable')}
        </Button>
      )}

      {plan.code === 'vip' && !canBuy && (
        <p className="text-xs text-muted-foreground text-center">
          {t('subscription.planCard.requiresMax')}
        </p>
      )}
    </div>
  )
}
