'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { ResumeForm } from '@/components/resume/ResumeForm'
import type { ResumeCreateInput } from '@/types/api'

interface Props {
  id: string
}

export const EditResumeClient = observer(function EditResumeClient({ id }: Props) {
  useTelegramBackButton()
  const { resume: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()
  const { t } = useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    void store.fetchResumeById(id)
  }, [store, id])

  const handleSubmit = async (data: ResumeCreateInput) => {
    setSubmitError(null)
    try {
      await store.updateResume(id, data)
      router.push('/dashboard/resumes')
    } catch {
      setSubmitError(store.error ?? t('dashboard.resumes.updateError'))
    }
  }

  if (!isAuthenticated) return null

  if (store.isLoading && !store.currentResume) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (!store.currentResume) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-card-foreground">
          {t('dashboard.resumes.notFound')}
        </p>
        <Link
          href="/dashboard/resumes"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          {t('dashboard.resumes.backFromNotFound')}
        </Link>
      </div>
    )
  }

  const r = store.currentResume

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/resumes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('dashboard.resumes.backToList')}
        </Link>
        <h1 className="text-2xl font-bold">{t('dashboard.resumes.editTitle')}</h1>
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <ResumeForm
        defaultValues={
          {
            title: r.title,
            firstName: r.firstName,
            lastName: r.lastName,
            country: r.country,
            city: r.city ?? undefined,
            desiredSalary: r.desiredSalary ?? undefined,
            currency: r.currency ?? undefined,
            workFormat: r.workFormat,
            employmentType: r.employmentType,
            experienceYears: r.experienceYears ?? undefined,
            about: r.about ?? undefined,
            skills: r.skills ?? undefined,
            contacts: r.contacts ?? undefined,
            workExperience: r.workExperience ?? undefined,
            education: r.education ?? undefined,
          } as Partial<import('@/types/api').ResumeCreateInput>
        }
        isLoading={store.isLoading}
        onSubmit={handleSubmit}
      />
    </div>
  )
})
