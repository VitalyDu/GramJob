'use client'

import { useCallback, useState } from 'react'
import { getTelegramWebApp, hapticNotify } from '@/lib/telegram'
import { isTelegramMiniApp } from './useTelegramPayment'

type InternalState = 'idle' | 'loading' | 'ready' | 'error'

export interface UseTelegramPaymentDialogResult {
  open: boolean
  state: Exclude<InternalState, 'idle'>
  invoiceUrl: string | undefined
  errorMessage: string | undefined
  start: (createInvoice: () => Promise<string>, onPaid?: () => void) => void
  retry: () => void
  close: () => void
}

export function useTelegramPaymentDialog(): UseTelegramPaymentDialogResult {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<InternalState>('idle')
  const [invoiceUrl, setInvoiceUrl] = useState<string | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [lastArgs, setLastArgs] = useState<{
    createInvoice: () => Promise<string>
    onPaid?: () => void
  } | null>(null)

  const run = useCallback(async (createInvoice: () => Promise<string>, onPaid?: () => void) => {
    const inMiniApp = isTelegramMiniApp()

    setLastArgs({ createInvoice, ...(onPaid ? { onPaid } : {}) })
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
        setState('idle')
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
    if (lastArgs) void run(lastArgs.createInvoice, lastArgs.onPaid)
  }, [lastArgs, run])

  const close = useCallback(() => {
    setOpen(false)
    setState('idle')
    setInvoiceUrl(undefined)
    setErrorMessage(undefined)
  }, [])

  return {
    open,
    state: state === 'idle' ? 'loading' : state,
    invoiceUrl,
    errorMessage,
    start,
    retry,
    close,
  }
}
