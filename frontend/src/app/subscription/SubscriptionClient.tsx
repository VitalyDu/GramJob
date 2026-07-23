'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard'
import { PlanLimitsCard } from '@/components/subscription/PlanLimitsCard'
import { PackageCard } from '@/components/subscription/PackageCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { canUpgradeToPlan } from '@/lib/subscription-utils'
import { useTelegramPaymentDialog } from '@/hooks/useTelegramPaymentDialog'
import { TelegramPaymentDialog } from '@/components/payment/TelegramPaymentDialog'

export const SubscriptionClient = observer(function SubscriptionClient() {
  const { t } = useTranslation()
  const { auth, payment } = useStores()
  const pay = useTelegramPaymentDialog()
  const router = useRouter()

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

  // Card-level spinner clears as soon as the dialog transitions out of loading
  // (or when it closes) — see the useEffect below.
  useEffect(() => {
    if (pay.state !== 'loading') {
      setBuyingPlan(null)
      setBuyingVacancyPack(null)
      setBuyingApplyPack(null)
    }
  }, [pay.state, pay.open])

  const onPaid = async () => {
    await auth.fetchMe()
    setShowRefreshHint(false)
  }

  const handleBuyPlan = (planCode: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    setBuyingPlan(planCode)
    setShowRefreshHint(true)
    pay.start(() => payment.subscribeToPlan(planCode), onPaid)
  }

  const handleBuyVacancyPack = (packageId: number) => {
    if (!user) {
      router.push('/login')
      return
    }
    setBuyingVacancyPack(packageId)
    setShowRefreshHint(true)
    pay.start(() => payment.buyVacancyPack(packageId), onPaid)
  }

  const handleBuyApplyPack = (packageId: number) => {
    if (!user) {
      router.push('/login')
      return
    }
    setBuyingApplyPack(packageId)
    setShowRefreshHint(true)
    pay.start(() => payment.buyApplyPack(packageId), onPaid)
  }

  const PLAN_ORDER = ['free', 'pro', 'max', 'vip']
  const orderedPlans = [...payment.plans].sort(
    (a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code)
  )

  return (
    <div className="space-y-10">
      <PageHeader
        title={t('subscription.pageTitle')}
        actions={
          user ? (
            <SubscriptionBadge
              plan={user.subscriptionPlan}
              expiresAt={user.subscriptionExpiresAt}
              showExpiry
            />
          ) : undefined
        }
      />

      {/* Использование плана */}
      {user ? (
        <section>
          <PlanLimitsCard />
        </section>
      ) : (
        <section>
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <p className="text-sm text-muted-foreground">{t('subscription.loginPrompt')}</p>
              <Button onClick={() => router.push('/login')}>{t('subscription.login')}</Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Уведомление о необходимости обновить статус */}
      {showRefreshHint && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">{t('subscription.refreshHint')}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await auth.fetchMe()
              setShowRefreshHint(false)
            }}
          >
            {t('subscription.refreshStatus')}
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
            {t('subscription.close')}
          </button>
        </div>
      )}

      {/* Планы подписки */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('subscription.plansTitle')}</h2>

        {payment.isLoading && payment.plans.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('subscription.loadingPlans')}</p>
        )}

        {orderedPlans.length > 0 && (
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {orderedPlans.map((plan) => {
              const currentPlan = user?.subscriptionPlan ?? 'free'
              return (
                <SubscriptionPlanCard
                  key={plan.code}
                  plan={plan}
                  currentPlan={currentPlan}
                  canBuy={canUpgradeToPlan(currentPlan, plan.code)}
                  isBuying={buyingPlan === plan.code}
                  onBuy={handleBuyPlan}
                  onSuccess={onPaid}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Пакеты вакансий */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('subscription.vacancyPacksTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('subscription.vacancyPacksDesc')}</p>

        {payment.vacancyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {payment.vacancyPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                type="vacancy"
                pkg={pkg}
                isBuying={buyingVacancyPack === pkg.id}
                onBuy={handleBuyVacancyPack}
                onSuccess={onPaid}
              />
            ))}
          </div>
        )}
      </section>

      {/* Пакеты откликов */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('subscription.applyPacksTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('subscription.applyPacksDesc')}</p>

        {payment.applyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {payment.applyPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                type="apply"
                pkg={pkg}
                isBuying={buyingApplyPack === pkg.id}
                onBuy={handleBuyApplyPack}
                onSuccess={onPaid}
              />
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <p className="pb-4 text-center text-xs text-muted-foreground">
        {t('subscription.disclaimer')}
      </p>

      <TelegramPaymentDialog
        open={pay.open}
        state={pay.state}
        {...(pay.invoiceUrl ? { invoiceUrl: pay.invoiceUrl } : {})}
        {...(pay.errorMessage ? { errorMessage: pay.errorMessage } : {})}
        onRetry={pay.retry}
        onOpenChange={(v) => {
          if (!v) pay.close()
        }}
      />
    </div>
  )
})
