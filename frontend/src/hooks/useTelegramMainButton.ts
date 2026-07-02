'use client'

import { useEffect, useRef, useState } from 'react'
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram'

interface MainButtonOptions {
  text: string
  onClick: () => void
  disabled?: boolean
  visible?: boolean
}

// Возвращает true в Mini App — вызывающая форма должна скрыть свою submit-кнопку.
export function useTelegramMainButton({
  text,
  onClick,
  disabled = false,
  visible = true,
}: MainButtonOptions): boolean {
  const [isMiniApp, setIsMiniApp] = useState(false)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  useEffect(() => {
    setIsMiniApp(isTelegramMiniApp())
  }, [])

  useEffect(() => {
    if (!isMiniApp || !visible) return
    const twa = getTelegramWebApp()
    if (!twa) return
    const handler = () => onClickRef.current()
    twa.MainButton.onClick(handler)
    twa.MainButton.show()
    return () => {
      twa.MainButton.offClick(handler)
      twa.MainButton.hide()
    }
  }, [isMiniApp, visible])

  useEffect(() => {
    if (!isMiniApp || !visible) return
    const twa = getTelegramWebApp()
    if (!twa) return
    twa.MainButton.text = text
    if (disabled) twa.MainButton.disable()
    else twa.MainButton.enable()
  }, [isMiniApp, visible, text, disabled])

  return isMiniApp
}
