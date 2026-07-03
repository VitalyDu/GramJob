import type { Metadata } from 'next'
import { CreateCompanyClient } from './CreateCompanyClient'

export const metadata: Metadata = {
  title: 'Новая компания | GramJob',
}

export default function NewCompanyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <CreateCompanyClient />
    </div>
  )
}
