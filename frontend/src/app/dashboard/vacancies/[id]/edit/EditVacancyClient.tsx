'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { VacancyForm } from '@/components/vacancy/VacancyForm'
import type { VacancyCreateInput } from '@/types/api'

interface Props {
  id: string
}

export const EditVacancyClient = observer(function EditVacancyClient({ id }: Props) {
  const { vacancy: vStore, company: cStore } = useStores()
  const router = useRouter()

  useEffect(() => {
    void vStore.fetchVacancyById(id)
    void cStore.fetchMyCompanies(1)
  }, [vStore, cStore, id])

  if (vStore.isLoading || !vStore.currentVacancy) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  const v = vStore.currentVacancy

  const handleSubmit = async (data: VacancyCreateInput) => {
    try {
      await vStore.updateVacancy(id, data)
      router.push('/dashboard/vacancies')
    } catch {
      // error в vStore.error
    }
  }

  const defaultValues: Partial<VacancyCreateInput> = {
    title: v.title,
    company: v.company.documentId,
    industry: v.industry.documentId,
    specialization: v.specialization.documentId,
    workFormat: v.workFormat,
    employmentType: v.employmentType,
    seniority: v.seniority,
    country: v.country,
    description: v.description ?? '',
    responsibilities: v.responsibilities ?? '',
    requirements: v.requirements ?? '',
    urgent: v.urgent,
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
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vacancies"
          className="text-sm text-muted-foreground hover:text-foreground"
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
