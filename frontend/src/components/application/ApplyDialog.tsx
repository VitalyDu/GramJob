'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { api } from '@/services/api'
import type { Resume } from '@/types/api'
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'

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
  const { t } = useTranslation()
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
      .catch(() => setFetchError(t('resumes.fetchError')))
  }, [isOpen, t])

  const submit = async () => {
    if (!resumeId) return
    await onSubmit(resumeId, coverLetter)
  }

  const mainButtonActive = useTelegramMainButton({
    text: isLoading ? t('apply.sending') : t('apply.submit'),
    onClick: () => void submit(),
    disabled: (isLoading ?? false) || !resumeId,
    visible: isOpen && !(limitReached ?? false) && !(alreadyApplied ?? false) && !fetchError,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>{t('apply.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">{vacancyTitle}</p>
        </DialogHeader>

        {alreadyApplied && (
          <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {t('apply.alreadyApplied')}
          </div>
        )}

        {limitReached && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            {t('apply.limitReached')}
          </div>
        )}

        {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}

        {!alreadyApplied && !limitReached && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {resumes.length === 0 && !fetchError ? (
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                {t('resumes.noPublished')}{' '}
                <a href="/dashboard/resumes" className="text-primary hover:underline">
                  {t('resumes.createLink')}
                </a>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="resumeId">{t('apply.resume')}</Label>
                  <Select value={resumeId} onValueChange={setResumeId} required>
                    <SelectTrigger id="resumeId" className="w-full">
                      <SelectValue placeholder={t('apply.selectResume')} />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((r) => (
                        <SelectItem key={r.documentId} value={r.documentId}>
                          {r.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="coverLetter">{t('apply.coverLetter')}</Label>
                  <Textarea
                    id="coverLetter"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={4}
                    placeholder={t('apply.coverLetterPlaceholder')}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    {t('common.cancel')}
                  </Button>
                  {!mainButtonActive && (
                    <Button type="submit" disabled={isLoading ?? !resumeId}>
                      {isLoading ? t('apply.sending') : t('apply.submit')}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </form>
        )}

        {(alreadyApplied ?? limitReached) && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
