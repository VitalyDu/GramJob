'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { api, ApiClientError } from '@/services/api'
import { useStores } from '@/stores/StoreProvider'
import type { Vacancy } from '@/types/api'

interface Props {
  isOpen: boolean
  resumeId: string
  candidateName: string
  onClose: () => void
  onSuccess?: () => void
}

export function InviteDialog({ isOpen, resumeId, candidateName, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { resume } = useStores()
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [vacancyId, setVacancyId] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [alreadyInvited, setAlreadyInvited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFetchError(null)
    setSubmitError(null)
    setAlreadyInvited(false)
    setSucceeded(false)
    api
      .get<{ data: Vacancy[] }>('/vacancies/my?status=published&pageSize=100')
      .then((res) => {
        setVacancies(res.data)
        if (res.data[0]) setVacancyId(res.data[0].documentId)
        else setVacancyId('')
      })
      .catch(() => setFetchError(t('invite.fetchError')))
  }, [isOpen, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vacancyId) return
    setIsSubmitting(true)
    setSubmitError(null)
    setAlreadyInvited(false)
    try {
      await resume.inviteCandidate(resumeId, vacancyId)
      setSucceeded(true)
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 409) {
          setAlreadyInvited(true)
        } else if (err.status === 403) {
          setSubmitError(t('invite.subscriptionRequired'))
        } else {
          setSubmitError(err.message)
        }
      } else {
        setSubmitError(t('invite.error'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>{t('invite.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('invite.subtitle', { name: candidateName })}
          </p>
        </DialogHeader>

        {succeeded && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            {t('invite.success')}
          </div>
        )}

        {alreadyInvited && (
          <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {t('invite.alreadyInvited')}
          </div>
        )}

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}

        {!succeeded && !alreadyInvited && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {vacancies.length === 0 && !fetchError ? (
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                {t('invite.noPublishedVacancies')}{' '}
                <a href="/dashboard/vacancies" className="text-primary hover:underline">
                  {t('invite.goToVacancies')}
                </a>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="vacancyId">{t('invite.vacancy')}</Label>
                  <Select value={vacancyId} onValueChange={setVacancyId} required>
                    <SelectTrigger id="vacancyId" className="w-full">
                      <SelectValue placeholder={t('invite.selectVacancy')} />
                    </SelectTrigger>
                    <SelectContent>
                      {vacancies.map((v) => (
                        <SelectItem key={v.documentId} value={v.documentId}>
                          {v.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !vacancyId}>
                    {isSubmitting ? t('invite.sending') : t('invite.submit')}
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        )}

        {(succeeded || alreadyInvited) && (
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
