import { formatStarsPrice, getPlanBadgeClasses } from '@/lib/subscription-utils'
import type { SubscriptionPlan } from '@/types/api'
import { Button } from '@/components/ui/button'

interface Props {
  plan: SubscriptionPlan
  currentPlan: string
  canBuy: boolean
  isBuying: boolean
  onBuy: (planCode: string) => void
}

export function SubscriptionPlanCard({ plan, currentPlan, canBuy, isBuying, onBuy }: Props) {
  const isActive = plan.code === currentPlan
  const badgeClasses = getPlanBadgeClasses(plan.code)

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-4 ${isActive ? 'border-indigo-400 bg-indigo-50/50' : 'border-border bg-card'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses}`}>
            {plan.name}
          </span>
          {isActive && <span className="ml-2 text-xs text-indigo-600 font-medium">Активный</span>}
        </div>
        <p className="text-base font-bold text-card-foreground">
          {formatStarsPrice(plan.starsPrice)}
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>
          Вакансий в месяц:{' '}
          <span className="font-medium text-card-foreground">{plan.vacanciesPerMonth}</span>
        </li>
        <li>
          Активных вакансий:{' '}
          <span className="font-medium text-card-foreground">{plan.activeVacanciesLimit}</span>
        </li>
        <li>
          Откликов в день:{' '}
          <span className="font-medium text-card-foreground">{plan.applicationsPerDay}</span>
        </li>
        <li>
          Резюме: <span className="font-medium text-card-foreground">{plan.resumesLimit}</span>
        </li>
        <li>
          База резюме:{' '}
          <span
            className={`font-medium ${plan.resumeDatabaseAccess ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            {plan.resumeDatabaseAccess ? '✓' : '✗'}
          </span>
        </li>
      </ul>

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
            ? 'Создание счёта...'
            : isActive
              ? 'Активный'
              : canBuy
                ? 'Купить'
                : 'Недоступно'}
        </Button>
      )}

      {plan.code === 'vip' && !canBuy && (
        <p className="text-xs text-muted-foreground text-center">Требует активный план Max</p>
      )}
    </div>
  )
}
