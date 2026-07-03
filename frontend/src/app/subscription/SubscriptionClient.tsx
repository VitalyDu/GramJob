'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard'
import { PackageCard } from '@/components/subscription/PackageCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { canUpgradeToPlan } from '@/lib/subscription-utils'
import { useTelegramPayment } from '@/hooks/useTelegramPayment'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'

export const SubscriptionClient = observer(function SubscriptionClient() {
  useTelegramBackButton()
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
      <PageHeader title="Подписка" />

      {/* Текущий план */}
      <section>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Ваш текущий план</p>
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
          </CardContent>
        </Card>
      </section>

      {/* Уведомление о необходимости обновить статус */}
      {showRefreshHint && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
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
        <div className="flex items-center justify-between rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{payment.error}</span>
          <button
            onClick={() => {
              payment.clearError()
            }}
            className="text-xs text-destructive hover:underline"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Планы подписки */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Планы подписки</h2>

        {payment.isLoading && payment.plans.length === 0 && (
          <p className="text-sm text-muted-foreground">Загрузка планов...</p>
        )}

        {paidPlans.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {paidPlans.map((plan) => (
              <div
                key={plan.code}
                className={
                  plan.code === user.subscriptionPlan ? 'ring-2 ring-primary rounded-xl' : ''
                }
              >
                <SubscriptionPlanCard
                  plan={plan}
                  currentPlan={user.subscriptionPlan}
                  canBuy={canUpgradeToPlan(user.subscriptionPlan, plan.code)}
                  isBuying={buyingPlan === plan.code}
                  onBuy={handleBuyPlan}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Пакеты вакансий */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Пакеты вакансий</h2>
        <p className="text-sm text-muted-foreground">
          Дополнительные кредиты для публикации вакансий. Не сгорают при смене плана.
        </p>

        {payment.vacancyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Пакеты откликов</h2>
        <p className="text-sm text-muted-foreground">
          Дополнительные отклики когда дневной лимит исчерпан.
        </p>

        {payment.applyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <p className="pb-4 text-center text-xs text-muted-foreground">
        Оплата производится через Telegram Stars. Возврат Stars невозможен.
      </p>
    </div>
  )
})
