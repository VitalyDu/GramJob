import type { Metadata } from 'next'
import { CompaniesClient } from './CompaniesClient'

export const metadata: Metadata = {
  title: 'Компании | GramJob',
  description: 'Каталог компаний на платформе GramJob',
}

export default function CompaniesPage() {
  return (
    <div className="container px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Компании</h1>
      <CompaniesClient />
    </div>
  )
}
