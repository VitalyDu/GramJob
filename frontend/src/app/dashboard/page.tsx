import type { Metadata } from 'next'
import { DashboardClient } from './DashboardClient'

export const metadata: Metadata = { title: 'Кабинет — GramJob' }

export default function DashboardPage() {
  return <DashboardClient />
}
