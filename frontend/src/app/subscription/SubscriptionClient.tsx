'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { auth, payment } = useStores()
  const { openInvoice } = useTelegramPayment()
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

  const handleBuyPlan = async (planCode: string) => {
    if (!user) {
      router.push('/login')
      return
    }
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
    if (!user) {
      router.push('/login')
      return
    }
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
    if (!user) {
      router.push('/login')
      return
    }
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

  const PLAN_ORDER = ['free', 'pro', 'max', 'vip']
  const orderedPlans = [...payment.plans].sort(
    (a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code)
  )

  return (
    <div className="space-y-10">
      <PageHeader title={t('subscription.pageTitle')} />

      {/* Текущий план */}
      {user ? (
        <section>
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">
                  {t('subscription.currentPlan')}
                </p>
                <SubscriptionBadge
                  plan={user.subscriptionPlan}
                  expiresAt={user.subscriptionExpiresAt}
                  showExpiry
                />
              </div>

              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>
                  {t('subscription.vacancyCreditsLeft')} <strong>{user.vacancyCredits}</strong>
                </span>
                <span>
                  {t('subscription.applyCreditsLeft')} <strong>{user.applyCredits}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {orderedPlans.map((plan) => {
              const currentPlan = user?.subscriptionPlan ?? 'free'
              return (
                <div
                  key={plan.code}
                  className={plan.code === currentPlan ? 'ring-2 ring-primary rounded-xl' : ''}
                >
                  <SubscriptionPlanCard
                    plan={plan}
                    currentPlan={currentPlan}
                    canBuy={canUpgradeToPlan(currentPlan, plan.code)}
                    isBuying={buyingPlan === plan.code}
                    onBuy={handleBuyPlan}
                  />
                </div>
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
              />
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <p className="pb-4 text-center text-xs text-muted-foreground">
        {t('subscription.disclaimer')}
      </p>
    </div>
  )
})
