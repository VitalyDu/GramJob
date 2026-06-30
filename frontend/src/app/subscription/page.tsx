import { SubscriptionClient } from './SubscriptionClient'

export const metadata = {
  title: 'Подписка | GramJob',
}

export default function SubscriptionPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <SubscriptionClient />
    </div>
  )
}
