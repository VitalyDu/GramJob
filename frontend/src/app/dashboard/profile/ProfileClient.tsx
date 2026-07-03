'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'

const LINKS = [
  { href: '/dashboard/publications', label: 'Мои публикации' },
  { href: '/dashboard/notifications', label: 'Уведомления' },
  { href: '/dashboard/favorites', label: 'Избранное' },
  { href: '/dashboard/saved-searches', label: 'Сохранённые поиски' },
  { href: '/dashboard/blocks', label: 'Блокировки' },
  { href: '/subscription', label: 'Подписка' },
]

export const ProfileClient = observer(function ProfileClient() {
  const { auth } = useStores()
  useRequireAuth()
  const router = useRouter()

  const user = auth.user
  if (!user) return null

  return (
    <div className="space-y-6">
      <PageHeader title={`${user.firstName} ${user.lastName}`} />

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
        Выйти
      </Button>
    </div>
  )
})
