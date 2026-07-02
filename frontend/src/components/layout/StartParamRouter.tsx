'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getTelegramWebApp, isTelegramMiniApp, parseStartParam } from '@/lib/telegram'

export function StartParamRouter() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current || !isTelegramMiniApp()) return
    handled.current = true
    const route = parseStartParam(getTelegramWebApp()?.initDataUnsafe.start_param)
    if (route) router.replace(route)
  }, [router])

  return null
}
