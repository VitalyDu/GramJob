'use client'

import { useCallback, useRef, useState } from 'react'
import { canOpenInvoiceNative, getTelegramWebApp, hapticNotify } from '@/lib/telegram'

export type TelegramPaymentDialogPublicState = 'loading' | 'ready' | 'error'

export interface UseTelegramPaymentDialogResult {
  open: boolean
  state: TelegramPaymentDialogPublicState
  invoiceUrl: string | undefined
  errorMessage: string | undefined
  start: (createInvoice: () => Promise<string>, onPaid?: () => void) => void
  retry: () => void
  close: () => void
}

interface LastArgs {
  createInvoice: () => Promise<string>
  onPaid?: () => void
}

export function useTelegramPaymentDialog(): UseTelegramPaymentDialogResult {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<TelegramPaymentDialogPublicState>('loading')
  const [invoiceUrl, setInvoiceUrl] = useState<string | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const lastArgsRef = useRef<LastArgs | null>(null)

  const run = useCallback(async (createInvoice: () => Promise<string>, onPaid?: () => void) => {
    const inMiniApp = canOpenInvoiceNative()

    lastArgsRef.current = { createInvoice, ...(onPaid ? { onPaid } : {}) }
    setErrorMessage(undefined)

    if (!inMiniApp) {
      setOpen(true)
      setState('loading')
    }

    try {
      const url = await createInvoice()
      setInvoiceUrl(url)

      if (inMiniApp) {
        const webApp = getTelegramWebApp()
        webApp?.openInvoice?.(url, (status: string) => {
          if (status === 'paid') {
            try {
              hapticNotify('success')
            } catch {
              // HapticFeedback may not be available in all environments
            }
            onPaid?.()
          }
        })
        setOpen(false)
      } else {
        setState('ready')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      if (!inMiniApp) {
        setState('error')
      }
    }
  }, [])

  const start = useCallback(
    (createInvoice: () => Promise<string>, onPaid?: () => void) => {
      void run(createInvoice, onPaid)
    },
    [run]
  )

  const retry = useCallback(() => {
    const args = lastArgsRef.current
    if (args) void run(args.createInvoice, args.onPaid)
  }, [run])

  const close = useCallback(() => {
    setOpen(false)
    setState('loading')
    setInvoiceUrl(undefined)
    setErrorMessage(undefined)
  }, [])

  return {
    open,
    state,
    invoiceUrl,
    errorMessage,
    start,
    retry,
    close,
  }
}
