'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard'
import { PackageCard } from '@/components/subscription/PackageCard'
import { Button } from '@/components/ui/button'
import { canUpgradeToPlan } from '@/lib/subscription-utils'
import { useTelegramPayment } from '@/hooks/useTelegramPayment'

export const SubscriptionClient = observer(function SubscriptionClient() {
  const { auth, payment } = useStores()
  const { openInvoice } = useTelegramPayment()

  const [buyingPlan, setBuyingPlan] = useState<string | null>(null)
  const [buyingVacancyPack, setBuyingVacancyPack] = useState<number | null>(null)
  const [buyingApplyPack, setBuyingApplyPack] = useState<number | null>(null)
  const [showRefreshHint, setShowRefreshHint] = useState(false)

  const user = auth.user

  useEffect(() => {
    void payment.fetchPlans()
    void payment.fetchVacancyPackages()
    void payment.fetchApplyPackages()
  }, [payment])

  const handleBuyPlan = async (planCode: string) => {
    setBuyingPlan(planCode)
    setShowRefreshHint(false)
    try {
      const url = await payment.subscribeToPlan(planCode)
      openInvoice(url, async () => {
        await auth.fetchMe()
        setShowRefreshHint(false)
      })
      setShowRefreshHint(true)
    } catch {
      // error displayed via payment.error
    } finally {
      setBuyingPlan(null)
    }
  }

  const handleBuyVacancyPack = async (packageId: number) => {
    setBuyingVacancyPack(packageId)
    setShowRefreshHint(false)
    try {
      const url = await payment.buyVacancyPack(packageId)
      openInvoice(url, async () => {
        await auth.fetchMe()
        setShowRefreshHint(false)
      })
      setShowRefreshHint(true)
    } catch {
      // error displayed via payment.error
    } finally {
      setBuyingVacancyPack(null)
    }
  }

  const handleBuyApplyPack = async (packageId: number) => {
    setBuyingApplyPack(packageId)
    setShowRefreshHint(false)
    try {
      const url = await payment.buyApplyPack(packageId)
      openInvoice(url, async () => {
        await auth.fetchMe()
        setShowRefreshHint(false)
      })
      setShowRefreshHint(true)
    } catch {
      // error displayed via payment.error
    } finally {
      setBuyingApplyPack(null)
    }
  }

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Войдите, чтобы управлять подпиской.</p>
      </div>
    )
  }

  const paidPlans = payment.plans.filter((p) => p.code !== 'free')

  return (
    <div className="space-y-10">
      {/* Текущий план */}
      <section>
        <h1 className="text-2xl font-bold text-card-foreground mb-4">Подписка</h1>

        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ваш текущий план</p>
            <SubscriptionBadge
              plan={user.subscriptionPlan}
              expiresAt={user.subscriptionExpiresAt}
              showExpiry
            />
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>
              Остаток кредитов вакансий: <strong>{user.vacancyCredits}</strong>
            </span>
            <span>
              Остаток кредитов откликов: <strong>{user.applyCredits}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Уведомление о необходимости обновить статус (в web) */}
      {showRefreshHint && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            После оплаты нажмите «Обновить статус», чтобы увидеть изменения.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await auth.fetchMe()
              setShowRefreshHint(false)
            }}
          >
            Обновить статус
          </Button>
        </div>
      )}

      {/* Ошибка */}
      {payment.error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{payment.error}</span>
          <button
            onClick={() => {
              payment.clearError()
            }}
            className="text-destructive hover:underline text-xs"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Планы подписки */}
      <section>
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Планы подписки</h2>

        {payment.isLoading && payment.plans.length === 0 && (
          <p className="text-sm text-muted-foreground">Загрузка планов...</p>
        )}

        {paidPlans.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {paidPlans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.code}
                plan={plan}
                currentPlan={user.subscriptionPlan}
                canBuy={canUpgradeToPlan(user.subscriptionPlan, plan.code)}
                isBuying={buyingPlan === plan.code}
                onBuy={handleBuyPlan}
              />
            ))}
          </div>
        )}
      </section>

      {/* Пакеты вакансий */}
      <section>
        <h2 className="text-lg font-semibold text-card-foreground mb-1">Пакеты вакансий</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Дополнительные кредиты для публикации вакансий. Не сгорают при смене плана.
        </p>

        {payment.vacancyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-4">
            {payment.vacancyPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                type="vacancy"
                pkg={pkg}
                isBuying={buyingVacancyPack === pkg.id}
                onBuy={handleBuyVacancyPack}
              />
            ))}
          </div>
        )}
      </section>

      {/* Пакеты откликов */}
      <section>
        <h2 className="text-lg font-semibold text-card-foreground mb-1">Пакеты откликов</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Дополнительные отклики когда дневной лимит исчерпан.
        </p>

        {payment.applyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {payment.applyPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                type="apply"
                pkg={pkg}
                isBuying={buyingApplyPack === pkg.id}
                onBuy={handleBuyApplyPack}
              />
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Оплата производится через Telegram Stars. Возврат Stars невозможен.
      </p>
    </div>
  )
})
