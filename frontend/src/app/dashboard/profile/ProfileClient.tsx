'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/PageHeader'

export const ProfileClient = observer(function ProfileClient() {
  const { t } = useTranslation()
  const { auth } = useStores()
  useRequireAuth()
  const router = useRouter()

  const LINKS = [
    { href: '/dashboard/publications', label: t('dashboard.profile.links.publications') },
    { href: '/dashboard/notifications', label: t('dashboard.profile.links.notifications') },
    { href: '/dashboard/favorites', label: t('dashboard.profile.links.favorites') },
    { href: '/dashboard/saved-searches', label: t('dashboard.profile.links.savedSearches') },
    { href: '/dashboard/blocks', label: t('dashboard.profile.links.blocks') },
    { href: '/subscription', label: t('dashboard.profile.links.subscription') },
  ]

  const user = auth.user
  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
            {(user.firstName?.charAt(0) ?? user.email?.charAt(0) ?? '?').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <PageHeader title={`${user.firstName} ${user.lastName}`} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <SubscriptionBadge
            plan={user.subscriptionPlan}
            expiresAt={user.subscriptionExpiresAt}
            showExpiry
          />
          {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <nav className="divide-y divide-border">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
              >
                <span>{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </nav>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          auth.logout()
          router.push('/')
        }}
      >
        {t('dashboard.profile.logout')}
      </Button>
    </div>
  )
})
