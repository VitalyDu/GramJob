'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useIsDesktop } from '@/hooks/useIsDesktop'
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'

const REASON_KEYS: ReportReason[] = ['spam', 'fraud', 'inappropriate', 'other']

interface Props {
  type: ReportType
  targetId: string
  isOpen: boolean
  onClose: () => void
}

export function ReportDialog({ type, targetId, isOpen, onClose }: Props) {
  const { auth } = useStores()
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
      setSubmitError(t('report.sendError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSent(false)
      setComment('')
      setReason('spam')
      setSubmitError(null)
      onClose()
    }
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={handleOpenChange}
      direction={isDesktop ? 'right' : 'bottom'}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{sent ? t('report.sentTitle') : t('report.title')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {sent ? (
            <p className="text-sm text-muted-foreground">{t('report.sentText')}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('report.reason')}
                </label>
                <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_KEYS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`report.reasons.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('report.comment')}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder={t('report.commentPlaceholder')}
                />
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            </div>
          )}
        </div>

        <DrawerFooter>
          {sent ? (
            <Button onClick={() => handleOpenChange(false)}>{t('common.close')}</Button>
          ) : (
            <>
              <Button onClick={() => void handleSubmit()} disabled={isLoading}>
                {isLoading ? t('report.sending') : t('report.submit')}
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t('common.cancel')}
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
