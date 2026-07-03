import type { Metadata } from 'next'
import { MyCompaniesClient } from './MyCompaniesClient'

export const metadata: Metadata = {
  title: 'Мои компании | GramJob',
}

export default function MyCompaniesPage() {
  return <MyCompaniesClient />
}
