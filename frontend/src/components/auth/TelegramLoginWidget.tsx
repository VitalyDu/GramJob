'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStores } from '@/stores/StoreProvider'
import type { TelegramWidgetUser } from '@/types/api'

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void
  }
}

interface Props {
  redirectTo?: string
}

export function TelegramLoginWidget({ redirectTo = '/' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { auth } = useStores()
  const router = useRouter()
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'GramJobBot'
  const [isLocalhost, setIsLocalhost] = useState(false)

  useEffect(() => {
    setIsLocalhost(
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    )
  }, [])

  useEffect(() => {
    if (isLocalhost) return

    window.onTelegramAuth = async (user: TelegramWidgetUser) => {
      try {
        await auth.loginWithTelegram({ telegramData: user })
        router.push(redirectTo)
      } catch {
        // error сохранён в auth.error
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true

    const container = containerRef.current
    container?.appendChild(script)

    return () => {
      delete window.onTelegramAuth
      if (container?.contains(script)) {
        container.removeChild(script)
      }
    }
  }, [auth, botUsername, isLocalhost, redirectTo, router])

  if (isLocalhost) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Telegram-вход недоступен на localhost
      </p>
    )
  }

  return <div ref={containerRef} />
}
