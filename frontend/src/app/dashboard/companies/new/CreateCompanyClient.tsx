'use client'

import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { CompanyForm } from '@/components/company/CompanyForm'
import type { CompanyCreateInput } from '@/types/api'

export const CreateCompanyClient = observer(function CreateCompanyClient() {
  const { company: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()
  const { t } = useTranslation()

  const handleSubmit = async (data: CompanyCreateInput) => {
    try {
      await store.createCompany(data)
      router.push('/dashboard/companies')
    } catch {
      // error сохранён в store.error
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/dashboard/companies"
          className="inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          {t('dashboard.companies.backToList')}
        </Link>
        <h1 className="text-2xl font-bold">{t('dashboard.companies.newTitle')}</h1>
      </div>

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      <CompanyForm onSubmit={handleSubmit} isLoading={store.isLoading} />
    </div>
  )
})
