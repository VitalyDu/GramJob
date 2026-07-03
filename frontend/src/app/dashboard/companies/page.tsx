import type { Metadata } from 'next'
import { MyCompaniesClient } from './MyCompaniesClient'

export const metadata: Metadata = {
  title: 'Мои компании | GramJob',
}

export default function MyCompaniesPage() {
  return (
    <div className="container px-4 py-8">
      <MyCompaniesClient />
    </div>
  )
}
