'use client'

import Link from 'next/link'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'

export const SubscriptionBanner = observer(function SubscriptionBanner() {
  const { auth } = useStores()
  const { t } = useTranslation()

  const plan = auth.user?.subscriptionPlan
  if (plan !== 'free' && plan !== 'pro') return null

  return (
    <Link href="/subscription" className="group block">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-violet-600 p-4 text-primary-foreground shadow-sm transition-shadow group-hover:shadow-md sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Sparkles className="h-6 w-6 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold sm:text-base">{t('dashboard.banner.title')}</p>
            <p className="text-sm opacity-90">{t('dashboard.banner.desc')}</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
})
