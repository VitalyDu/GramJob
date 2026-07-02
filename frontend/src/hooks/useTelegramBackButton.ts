'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram'

export function useTelegramBackButton(): void {
  const router = useRouter()

  useEffect(() => {
    if (!isTelegramMiniApp()) return
    const twa = getTelegramWebApp()
    if (!twa) return
    const handler = () => router.back()
    twa.BackButton.onClick(handler)
    twa.BackButton.show()
    return () => {
      twa.BackButton.offClick(handler)
      twa.BackButton.hide()
    }
  }, [router])
}
