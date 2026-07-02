'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { VacancyForm } from '@/components/vacancy/VacancyForm'
import type { VacancyCreateInput } from '@/types/api'

export const CreateVacancyClient = observer(function CreateVacancyClient() {
  useTelegramBackButton()
  const { vacancy: vStore, company: cStore } = useStores()
  const router = useRouter()

  useEffect(() => {
    void cStore.fetchMyCompanies(1)
  }, [cStore])

  const handleSubmit = async (data: VacancyCreateInput) => {
    try {
      await vStore.createVacancy(data)
      router.push('/dashboard/vacancies')
    } catch {
      // error сохранён в vStore.error
    }
  }

  return (
    <div className="space-y-6">
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
