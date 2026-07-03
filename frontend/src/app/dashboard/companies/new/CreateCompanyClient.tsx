'use client'

import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { CompanyForm } from '@/components/company/CompanyForm'
import type { CompanyCreateInput } from '@/types/api'

export const CreateCompanyClient = observer(function CreateCompanyClient() {
  useTelegramBackButton()
  const { company: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()

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
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/companies"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои компании
        </Link>
        <h1 className="text-2xl font-bold">Новая компания</h1>
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
