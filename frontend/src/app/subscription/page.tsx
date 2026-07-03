import { SubscriptionClient } from './SubscriptionClient'

export const metadata = {
  title: 'Подписка | GramJob',
}

export default function SubscriptionPage() {
  return (
    <div className="container px-4 py-8">
      <SubscriptionClient />
    </div>
  )
}
