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

interface Props {
  id: string
}

export const EditVacancyClient = observer(function EditVacancyClient({ id }: Props) {
  useTelegramBackButton()
  const { vacancy: vStore, company: cStore } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()

  useEffect(() => {
    void vStore.fetchMyVacancyById(id)
    void cStore.fetchMyCompanies(1)
  }, [vStore, cStore, id])

  if (!isAuthenticated) return null

  if (vStore.isLoading || !vStore.currentVacancy) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  const v = vStore.currentVacancy

  const handleSubmit = async (data: VacancyCreateInput) => {
    try {
      const updated = await vStore.updateVacancy(id, data)
      if (updated === null) {
        // limitReached уже установлен в сторе, UpsellModal откроется
        return
      }
      toast.success('Изменения сохранены — вакансия отправлена на модерацию')
      router.push('/dashboard/vacancies')
    } catch {
      // error в vStore.error
    }
  }

  const defaultValues: Partial<VacancyCreateInput> = {
    title: v.title,
    industryId: v.industry.documentId,
    specializationId: v.specialization.documentId,
    workFormat: v.workFormat,
    employmentType: v.employmentType,
    seniority: v.seniority,
    country: v.country,
    description: v.description ?? '',
    responsibilities: v.responsibilities ?? '',
    requirements: v.requirements ?? '',
    urgent: v.urgent,
    ...(v.company?.documentId ? { companyId: v.company.documentId } : {}),
    ...(v.city ? { city: v.city } : {}),
    ...(v.salaryFrom != null ? { salaryFrom: v.salaryFrom } : {}),
    ...(v.salaryTo != null ? { salaryTo: v.salaryTo } : {}),
    ...(v.salaryCurrency ? { salaryCurrency: v.salaryCurrency } : {}),
    ...(v.conditions ? { conditions: v.conditions } : {}),
    ...(v.skills?.length ? { skills: v.skills } : {}),
    ...(v.languages?.length ? { languages: v.languages } : {}),
    ...(v.experienceYears != null ? { experienceYears: v.experienceYears } : {}),
  }

  return (
    <div className="space-y-6">
      <UpsellModal isOpen={vStore.limitReached} onClose={() => vStore.clearLimitReached()} />

      <div className="space-y-1">
        <Link
          href="/dashboard/vacancies"
          className="inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Редактировать вакансию</h1>
      </div>

      {vStore.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {vStore.error}
        </p>
      )}

      <VacancyForm
        myCompanies={cStore.myCompanies}
        isLoading={vStore.isLoading}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
      />
    </div>
  )
})
