'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { isTelegramMiniApp, getTelegramWebApp, type TelegramWebApp } from '@/lib/telegram'
import { useStores } from '@/stores/StoreProvider'

export function useTelegramInit() {
  const [isMiniApp, setIsMiniApp] = useState(false)
  const [twa, setTwa] = useState<TelegramWebApp | null>(null)
  const { auth } = useStores()
  const { setTheme } = useTheme()

  useEffect(() => {
    const isMA = isTelegramMiniApp()
    setIsMiniApp(isMA)
    if (!isMA) return

    const app = getTelegramWebApp()!
    setTwa(app)
    app.ready()
    app.expand()

    setTheme(app.colorScheme)
    const onThemeChanged = () => setTheme(app.colorScheme)
    app.onEvent('themeChanged', onThemeChanged)

    if (!auth.isAuthenticated && app.initData) {
      auth.loginWithTelegram({ initData: app.initData }).catch(() => {
        // error уже в auth.error
      })
    }

    return () => {
      app.offEvent('themeChanged', onThemeChanged)
    }
  }, [auth, setTheme])

  return { isMiniApp, twa }
}
