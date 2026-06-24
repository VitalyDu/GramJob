'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Image from 'next/image'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { StatusBadge } from '@/components/company/StatusBadge'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { getMediaUrl } from '@/lib/media'

interface Props {
  id: string
}

export const CompanyDetailClient = observer(function CompanyDetailClient({ id }: Props) {
  const { company: store } = useStores()

  useEffect(() => {
    void store.fetchCompanyById(id)
  }, [store, id])

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (store.error || !store.currentCompany) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Компания не найдена</p>
        {store.error && <p className="mt-1 text-sm text-muted-foreground">{store.error}</p>}
        <Link href="/companies" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Все компании
        </Link>
      </div>
    )
  }

  const company = store.currentCompany
  const logoUrl = getMediaUrl(company.logo?.url)
  const coverUrl = getMediaUrl(company.cover?.url)

  return (
    <div className="space-y-6">
      {coverUrl && (
        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-gray-100">
          <Image src={coverUrl} alt="" fill className="object-cover" />
        </div>
      )}

      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={company.name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-gray-400">
              {company.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <StatusBadge status={company.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>{company.country}</span>
            {company.city && <span>{company.city}</span>}
            <span>{COMPANY_SIZE_LABELS[company.companySize]}</span>
          </div>
        </div>
      </div>

      {company.description && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">О компании</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{company.description}</p>
        </div>
      )}

      {(company.website || company.telegram || company.linkedin) && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Контакты</h2>
          <div className="flex flex-wrap gap-3">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {company.telegram && <span className="text-sm text-gray-600">{company.telegram}</span>}
            {company.linkedin && (
              <a
                href={company.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground">
          ← Все компании
        </Link>
      </div>
    </div>
  )
})
