'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { ResumeForm } from '@/components/resume/ResumeForm'
import type { ResumeCreateInput } from '@/types/api'

export const CreateResumeClient = observer(function CreateResumeClient() {
  useTelegramBackButton()
  const { resume: store } = useStores()
  const isAuthenticated = useRequireAuth()
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (data: ResumeCreateInput) => {
    setSubmitError(null)
    try {
      await store.createResume(data)
      router.push('/dashboard/resumes')
    } catch {
      setSubmitError(store.error ?? 'Не удалось создать резюме')
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/resumes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold">Новое резюме</h1>
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <ResumeForm isLoading={store.isLoading} onSubmit={handleSubmit} />
    </div>
  )
})
