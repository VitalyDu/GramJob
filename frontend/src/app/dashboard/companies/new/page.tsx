import type { Metadata } from 'next'
import { CreateCompanyClient } from './CreateCompanyClient'

export const metadata: Metadata = {
  title: 'Новая компания | GramJob',
}

export default function NewCompanyPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <CreateCompanyClient />
    </div>
  )
}
