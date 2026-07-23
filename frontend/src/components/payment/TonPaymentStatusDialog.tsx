'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  phase: 'idle' | 'creating' | 'awaiting_signature' | 'awaiting_confirmation' | 'success' | 'error'
  error?: string
  onClose: () => void
}

export function TonPaymentStatusDialog({ phase, error, onClose }: Props) {
  const { t } = useTranslation()
  const open = phase !== 'idle'
  if (!open) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tonPayment.statusTitle')}</DialogTitle>
        </DialogHeader>

        {(phase === 'creating' ||
          phase === 'awaiting_signature' ||
          phase === 'awaiting_confirmation') && (
          <StatusRow
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            text={t(`tonPayment.${phase}`)}
          />
        )}
        {phase === 'success' && (
          <>
            <StatusRow
              icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
              text={t('tonPayment.success')}
            />
            <Button onClick={onClose} className="mt-4 w-full">
              {t('tonPayment.close')}
            </Button>
          </>
        )}
        {phase === 'error' && (
          <>
            <StatusRow
              icon={<XCircle className="h-5 w-5 text-destructive" />}
              text={error ?? t('tonPayment.errorGeneric')}
            />
            <Button onClick={onClose} className="mt-4 w-full" variant="outline">
              {t('tonPayment.close')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StatusRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  )
}
