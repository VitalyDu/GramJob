import { useTranslation } from 'react-i18next'
import type { SubscriptionPlan } from '@/types/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  plans?: SubscriptionPlan[]
}

export function UpsellModal({ isOpen, onClose, plans = [] }: Props) {
  const { t } = useTranslation()
  if (!isOpen) return null

  const upsellPlans = plans.filter((p) => p.code === 'pro' || p.code === 'max')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div data-overlay className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">
            {t('subscription.upsell.title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('subscription.upsell.close')}
            className="ml-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
          >
            ✕
          </button>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">{t('subscription.upsell.body')}</p>

        {upsellPlans.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upsellPlans.map((plan) => (
              <div key={plan.code} className="rounded-xl border border-border p-4 text-center">
                <p className="text-base font-bold text-card-foreground">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('subscription.upsell.vacanciesPerMonth', { count: plan.vacanciesPerMonth })}
                </p>
                <p className="mt-2 text-sm font-medium text-indigo-600">
                  {plan.starsPrice != null
                    ? `${plan.starsPrice} ★`
                    : t('subscription.starsPrice.free')}
                </p>
              </div>
            ))}
          </div>
        )}

        <a
          href="/subscription"
          className="block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
        >
          {t('subscription.upsell.upgrade')}
        </a>
      </div>
    </div>
  )
}
