'use client'

import { useEffect, useState } from 'react'
import { isTelegramMiniApp, getTelegramWebApp, type TelegramWebApp } from '@/lib/telegram'
import { useStores } from '@/stores/StoreProvider'
import { applyTelegramTheme } from '@/lib/telegram-theme'

export function useTelegramInit() {
  const [isMiniApp, setIsMiniApp] = useState(false)
  const [twa, setTwa] = useState<TelegramWebApp | null>(null)
  const { auth } = useStores()

  useEffect(() => {
    const isMA = isTelegramMiniApp()
    setIsMiniApp(isMA)
    if (!isMA) return

    const app = getTelegramWebApp()!
    setTwa(app)
    app.ready()
    app.expand()
    applyTelegramTheme(app)
    const onThemeChanged = () => applyTelegramTheme(app)
    app.onEvent('themeChanged', onThemeChanged)

    if (!auth.isAuthenticated && app.initData) {
      auth.loginWithTelegram({ initData: app.initData }).catch(() => {
        // error уже в auth.error
      })
    }

    return () => {
      app.offEvent('themeChanged', onThemeChanged)
    }
  }, [auth])

  return { isMiniApp, twa }
}
