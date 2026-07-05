import type { Metadata } from 'next'
import { fetchCompanyServer } from '@/lib/server-api'
import { getMediaUrl } from '@/lib/media'
import { CompanyDetailClient } from './CompanyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const company = await fetchCompanyServer(id)
  if (!company) return { title: 'Компания | GramJob' }

  const description =
    (company.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Профиль компании ${company.name} на GramJob`
  const logoUrl = getMediaUrl(company.logo?.url)

  return {
    title: `${company.name} | GramJob`,
    description,
    alternates: { canonical: `/companies/${id}` },
    openGraph: {
      title: company.name,
      description,
      type: 'website',
      url: `/companies/${id}`,
      ...(logoUrl ? { images: [logoUrl] } : {}),
    },
  }
}

export default async function CompanyPage({ params }: Props) {
  const { id } = await params
  const company = await fetchCompanyServer(id)
  return <CompanyDetailClient id={id} {...(company ? { initialCompany: company } : {})} />
}
