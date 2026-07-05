import type { Metadata } from 'next'
import { fetchCompaniesPageServer } from '@/lib/server-api'
import { CompaniesClient } from './CompaniesClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Компании | GramJob',
  description: 'Каталог компаний на платформе GramJob',
  alternates: { canonical: '/companies' },
}

export default async function CompaniesPage() {
  const { items, total } = await fetchCompaniesPageServer(1, 20)
  return <CompaniesClient initialCompanies={items} initialTotal={total} />
}
