'use client'

import { getTelegramWebApp } from '@/lib/telegram'

export function useTelegramPayment() {
  const openInvoice = (url: string, onPaid?: () => void): void => {
    const webApp = getTelegramWebApp()

    if (webApp?.openInvoice) {
      webApp.openInvoice(url, (status: string) => {
        if (status === 'paid' && onPaid) {
          onPaid()
        }
      })
    } else {
      window.open(url, '_blank')
    }
  }

  return { openInvoice }
}
