'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ResumeForm } from '@/components/resume/ResumeForm'
import { getTelegramWebApp } from '@/lib/telegram'
import type { ResumeCreateInput } from '@/types/api'

export const CreateResumeClient = observer(function CreateResumeClient() {
  const { resume: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()
  const { t } = useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (data: ResumeCreateInput) => {
    setSubmitError(null)
    try {
      await store.createResume(data)
      router.push('/dashboard/resumes')
    } catch {
      setSubmitError(store.error ?? t('dashboard.resumes.createError'))
    }
  }

  if (!isAuthenticated) return null

  const tgUsername = getTelegramWebApp()?.initDataUnsafe?.user?.username
  const telegramDefault = tgUsername ? `@${tgUsername}` : undefined

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/dashboard/resumes"
          className="inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          {t('dashboard.resumes.backToList')}
        </Link>
        <h1 className="text-2xl font-bold">{t('dashboard.resumes.newTitle')}</h1>
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <ResumeForm
        isLoading={store.isLoading}
        onSubmit={handleSubmit}
        {...(telegramDefault ? { defaultValues: { contacts: { telegram: telegramDefault } } } : {})}
      />
    </div>
  )
})
