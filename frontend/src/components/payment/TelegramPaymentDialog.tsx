'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export type TelegramPaymentDialogState = 'loading' | 'ready' | 'error'

export interface TelegramPaymentDialogProps {
  open: boolean
  state: TelegramPaymentDialogState
  invoiceUrl?: string
  errorMessage?: string
  onRetry?: () => void
  onOpenChange: (open: boolean) => void
}

export function TelegramPaymentDialog({
  open,
  state,
  invoiceUrl,
  errorMessage,
  onRetry,
  onOpenChange,
}: TelegramPaymentDialogProps) {
  const { t } = useTranslation()
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (state !== 'ready' || !invoiceUrl) {
      setQrSvg(null)
      return
    }
    let cancelled = false
    QRCode.toString(invoiceUrl, { type: 'svg', margin: 1, width: 220 })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg)
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null)
      })
    return () => {
      cancelled = true
    }
  }, [state, invoiceUrl])

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    },
    []
  )

  const handleCopy = async () => {
    if (!invoiceUrl) return
    try {
      await navigator.clipboard.writeText(invoiceUrl)
      setCopied(true)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable (HTTP context or permission denied) — no-op is acceptable
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-md sm:mx-auto">
        <DrawerHeader>
          <DrawerTitle>{t('telegramPayment.title')}</DrawerTitle>
          {state === 'ready' && (
            <DrawerDescription>{t('telegramPayment.descriptionWeb')}</DrawerDescription>
          )}
        </DrawerHeader>

        <div className="px-4">
          {state === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('telegramPayment.loading')}</p>
            </div>
          )}

          {state === 'ready' && invoiceUrl && (
            <div className="flex flex-col items-center gap-4 py-2">
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('telegramPayment.openInTelegram')}
              </a>

              {qrSvg && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">{t('telegramPayment.orScanQr')}</p>
                  {/* QR scanners require a white background regardless of app theme */}
                  <div
                    className="rounded-md bg-white p-2"
                    dangerouslySetInnerHTML={{
                      __html: qrSvg.replace('<svg', '<svg data-testid="tg-payment-qr"'),
                    }}
                  />
                </div>
              )}

              <div className="flex flex-col items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? t('telegramPayment.copied') : t('telegramPayment.copyLink')}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t('telegramPayment.afterPayment')}
                </p>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm font-medium text-destructive">
                {t('telegramPayment.errorTitle')}
              </p>
              {errorMessage && <p className="text-xs text-muted-foreground">{errorMessage}</p>}
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  {t('telegramPayment.errorRetry')}
                </Button>
              )}
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('telegramPayment.close')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
