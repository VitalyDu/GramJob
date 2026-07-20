'use client'

import { getTelegramWebApp, hapticNotify } from '@/lib/telegram'

export function isTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp()
  return typeof webApp?.openInvoice === 'function'
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
  }
}
