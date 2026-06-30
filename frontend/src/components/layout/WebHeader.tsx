'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'

export const WebHeader = observer(function WebHeader() {
  const { t } = useTranslation()
  const { auth } = useStores()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-bold text-lg text-primary">
          GramJob
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/vacancies"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.vacancies')}
          </Link>

          {auth.isAuthenticated && auth.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/subscription"
                className="flex items-center"
                aria-label="Управление подпиской"
              >
                <SubscriptionBadge plan={auth.user.subscriptionPlan} />
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.dashboard')}
              </Link>
              <Button variant="ghost" size="sm" onClick={() => auth.logout()}>
                {t('auth.logout')}
              </Button>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{t('nav.login')}</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
})
