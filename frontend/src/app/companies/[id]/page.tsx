import type { Metadata } from 'next'
import { CompanyDetailClient } from './CompanyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'}/companies/${id}`,
      { next: { revalidate: 3600 } }
    )
    if (res.ok) {
      const json = (await res.json()) as { data?: { name?: string; description?: string } }
      const company = json.data
      if (company?.name) {
        return {
          title: `${company.name} | GramJob`,
          description: company.description ?? `Профиль компании ${company.name} на GramJob`,
        }
      }
    }
  } catch {
    // fallback below
  }
  return { title: 'Компания | GramJob' }
}

export default async function CompanyPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <CompanyDetailClient id={id} />
    </div>
  )
}
