'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { VacancyForm } from '@/components/vacancy/VacancyForm'
import { UpsellModal } from '@/components/vacancy/UpsellModal'
import type { VacancyCreateInput } from '@/types/api'

export const CreateVacancyClient = observer(function CreateVacancyClient() {
  useTelegramBackButton()
  const { vacancy: vStore, company: cStore } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()

  useEffect(() => {
    void cStore.fetchMyCompanies(1)
  }, [cStore])

  const handleSubmit = async (data: VacancyCreateInput) => {
    try {
      const created = await vStore.createVacancy(data)
      if (created === null) {
        // limitReached уже установлен в сторе, UpsellModal откроется
        return
      }
      toast.success('Вакансия отправлена на модерацию')
      router.push('/dashboard/vacancies')
    } catch {
      // error сохранён в vStore.error
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <UpsellModal isOpen={vStore.limitReached} onClose={() => vStore.clearLimitReached()} />

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vacancies"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Новая вакансия</h1>
      </div>

      {vStore.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {vStore.error}
        </p>
      )}

      <VacancyForm
        myCompanies={cStore.myCompanies}
        isLoading={vStore.isLoading}
        onSubmit={handleSubmit}
      />
    </div>
  )
})
