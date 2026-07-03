import type { Metadata } from 'next'
import { CompaniesClient } from './CompaniesClient'

export const metadata: Metadata = {
  title: 'Компании | GramJob',
  description: 'Каталог компаний на платформе GramJob',
}

export default function CompaniesPage() {
  return <CompaniesClient />
}
