'use client'

import { useState } from 'react'
import { useStores } from '@/stores/StoreProvider'
import { api } from '@/services/api'
import type { ReportType, ReportReason } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Спам',
  fraud: 'Мошенничество',
  inappropriate: 'Неприемлемый контент',
  other: 'Другое',
}

interface Props {
  type: ReportType
  targetId: string
  isOpen: boolean
  onClose: () => void
}

export function ReportDialog({ type, targetId, isOpen, onClose }: Props) {
  const { auth } = useStores()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (!isOpen) return null
  if (!auth.user) return null

  const handleSubmit = async () => {
    setIsLoading(true)
    setSubmitError(null)
    try {
      await api.post('/reports', {
        type,
        targetId,
        reason,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      })
      setSent(true)
    } catch {
      setSubmitError('Не удалось отправить жалобу. Попробуйте ещё раз.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSent(false)
    setComment('')
    setReason('spam')
    setSubmitError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        {sent ? (
          <>
            <h2 className="text-lg font-semibold text-card-foreground">Жалоба отправлена</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Спасибо, мы рассмотрим жалобу в ближайшее время.
            </p>
            <Button className="mt-4" onClick={handleClose}>
              Закрыть
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-card-foreground">Пожаловаться</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Причина</label>
                <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REASON_LABELS) as ReportReason[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {REASON_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Комментарий (необязательно)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Опишите проблему подробнее..."
                />
              </div>
            </div>

            {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}

            <div className="mt-5 flex gap-3">
              <Button onClick={() => void handleSubmit()} disabled={isLoading}>
                {isLoading ? 'Отправка...' : 'Отправить'}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
