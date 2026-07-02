'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { Button } from '@/components/ui/button'

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
  const router = useRouter()

  const user = auth.user
  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Войдите, чтобы открыть профиль.</p>
        <Button className="mt-4" onClick={() => router.push('/login')}>
          Войти
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {user.firstName} {user.lastName}
        </h1>
        <div className="mt-2">
          <SubscriptionBadge
            plan={user.subscriptionPlan}
            expiresAt={user.subscriptionExpiresAt}
            showExpiry
          />
        </div>
        {user.email && <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>}
      </div>

      <nav className="divide-y divide-border rounded-xl border border-border bg-card">
        {LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className="block px-4 py-3 text-sm hover:bg-muted">
            {label}
          </Link>
        ))}
      </nav>

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
