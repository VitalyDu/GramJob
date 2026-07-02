'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { api } from '@/services/api'
import type { Resume } from '@/types/api'

interface Props {
  isOpen: boolean
  vacancyId: string
  vacancyTitle: string
  onClose: () => void
  onSubmit: (resumeId: string, coverLetter: string) => Promise<void>
  isLoading?: boolean
  limitReached?: boolean
  alreadyApplied?: boolean
}

export function ApplyDialog({
  isOpen,
  vacancyId: _vacancyId,
  vacancyTitle,
  onClose,
  onSubmit,
  isLoading,
  limitReached,
  alreadyApplied,
}: Props) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setFetchError(null)
    api
      .get<{ data: Resume[] }>('/resumes/my?pageSize=100')
      .then((res) => {
        const published = res.data.filter((r) => r.status === 'published')
        setResumes(published)
        if (published[0]) setResumeId(published[0].documentId)
      })
      .catch(() => setFetchError('Не удалось загрузить резюме'))
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resumeId) return
    await onSubmit(resumeId, coverLetter)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-card-foreground">Откликнуться</h2>
        <p className="mt-1 text-sm text-muted-foreground">{vacancyTitle}</p>

        {alreadyApplied && (
          <div className="mt-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Вы уже откликались на эту вакансию.
          </div>
        )}

        {limitReached && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Дневной лимит откликов исчерпан. Обновите план для большего количества откликов.
          </div>
        )}

        {fetchError && <p className="mt-4 text-sm text-destructive">{fetchError}</p>}

        {!alreadyApplied && !limitReached && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {resumes.length === 0 && !fetchError ? (
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                У вас нет опубликованных резюме.{' '}
                <a href="/dashboard/resumes" className="text-primary hover:underline">
                  Создать резюме →
                </a>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="resumeId">Резюме</Label>
                  <select
                    id="resumeId"
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {resumes.map((r) => (
                      <option key={r.documentId} value={r.documentId}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="coverLetter">Сопроводительное письмо (необязательно)</Label>
                  <textarea
                    id="coverLetter"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Расскажите, почему вы подходите на эту позицию..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={isLoading ?? !resumeId} className="flex-1">
                    {isLoading ? 'Отправка...' : 'Откликнуться'}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Отмена
                  </Button>
                </div>
              </>
            )}
          </form>
        )}

        {(alreadyApplied ?? limitReached) && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
