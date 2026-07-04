'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { CompanyForm } from '@/components/company/CompanyForm'
import type { CompanyUpdateInput } from '@/types/api'

interface Props {
  id: string
}

export const EditCompanyClient = observer(function EditCompanyClient({ id }: Props) {
  useTelegramBackButton()
  const { company: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    void store.fetchMyCompanyById(id)
  }, [store, id])

  const handleSubmit = async (data: CompanyUpdateInput) => {
    try {
      await store.updateCompany(id, data)
      router.push('/dashboard/companies')
    } catch {
      // error сохранён в store.error
    }
  }

  if (!isAuthenticated) return null

  if (store.isLoading && !store.currentCompany) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (!store.currentCompany) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">{t('dashboard.companies.notFound')}</p>
        <Link
          href="/dashboard/companies"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          {t('dashboard.companies.backFromNotFound')}
        </Link>
      </div>
    )
  }

  const company = store.currentCompany

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/dashboard/companies"
          className="inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          {t('dashboard.companies.backToList')}
        </Link>
        <h1 className="text-2xl font-bold">
          {t('dashboard.companies.editTitle', { name: company.name })}
        </h1>
      </div>

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      <CompanyForm
        onSubmit={handleSubmit}
        isLoading={store.isLoading}
        defaultValues={{
          name: company.name,
          country: company.country,
          companySize: company.companySize,
          description: company.description ?? '',
          city: company.city ?? '',
          website: company.website ?? '',
          telegram: company.telegram ?? '',
          linkedin: company.linkedin ?? '',
        }}
      />
    </div>
  )
})
