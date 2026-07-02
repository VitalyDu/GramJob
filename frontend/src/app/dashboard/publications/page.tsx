import type { Metadata } from 'next'
import { PublicationsClient } from './PublicationsClient'

export const metadata: Metadata = {
  title: 'Мои публикации — GramJob',
}

export default function PublicationsPage() {
  return <PublicationsClient />
}
