'use client'

import { useEffect, useState } from 'react'
import { isTelegramMiniApp, getTelegramWebApp, type TelegramWebApp } from '@/lib/telegram'
import { useStores } from '@/stores/StoreProvider'

export function useTelegramInit() {
  const [isMiniApp, setIsMiniApp] = useState(false)
  const [twa, setTwa] = useState<TelegramWebApp | null>(null)
  const { auth } = useStores()

  useEffect(() => {
    const isMA = isTelegramMiniApp()
    setIsMiniApp(isMA)
    if (!isMA) return

    document.documentElement.classList.add('mini-app')

    const app = getTelegramWebApp()!
    setTwa(app)
    app.ready()
    app.expand()

    if (!auth.isAuthenticated && app.initData) {
      auth.loginWithTelegram({ initData: app.initData }).catch(() => {
        // error уже в auth.error
      })
    }
  }, [auth])

  return { isMiniApp, twa }
}
