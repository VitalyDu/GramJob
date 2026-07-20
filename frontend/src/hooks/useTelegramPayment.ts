'use client'

import { getTelegramWebApp, hapticNotify } from '@/lib/telegram'

export function isTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp()
  return typeof webApp?.openInvoice === 'function'
}

/**
 * @deprecated Legacy shim for existing call sites (SubscriptionClient, MyVacanciesClient).
 * These will be migrated to useTelegramPaymentDialog in later tasks; then this shim will be removed.
 */
function openInvoiceShim(url: string, onPaid?: () => void): void {
  if (typeof window === 'undefined') return
  const webApp = getTelegramWebApp()
  if (webApp?.openInvoice) {
    webApp.openInvoice(url, (status: string) => {
      if (status === 'paid' && onPaid) {
        hapticNotify('success')
        onPaid()
      }
    })
  } else {
    window.open(url, '_blank')
  }
}

export function useTelegramPayment() {
  const openInvoiceInMiniApp = (url: string, onPaid?: () => void): void => {
    const webApp = getTelegramWebApp()
    if (!webApp?.openInvoice) {
      throw new Error('openInvoiceInMiniApp called outside Telegram Mini App')
    }
    webApp.openInvoice(url, (status: string) => {
      if (status === 'paid' && onPaid) {
        hapticNotify('success')
        onPaid()
      }
    })
  }

  return {
    openInvoiceInMiniApp,
    isMiniApp: isTelegramMiniApp(),
    /** @deprecated Use openInvoiceInMiniApp + useTelegramPaymentDialog instead. */
    openInvoice: openInvoiceShim,
  }
}
