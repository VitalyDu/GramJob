'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

  // useLayoutEffect гарантирует, что cleanup (скрытие кнопки + событие tg-main-btn-hide)
  // выполнится синхронно до отрисовки новой страницы. С useEffect cleanup запускается
  // уже после paint — пользователь видел бы новую страницу без BottomNav на один кадр.
  useLayoutEffect(() => {
    if (!isMiniApp || !visible) return
    const twa = getTelegramWebApp()
    if (!twa) return
    const handler = () => {
      // Снимаем фокус с поля ввода — иначе после клика по нативной кнопке
      // клавиатура считается открытой и BottomNav не появляется.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      onClickRef.current()
    }
    twa.MainButton.onClick(handler)
    twa.MainButton.show()
    window.dispatchEvent(new CustomEvent('tg-main-btn-show'))
    return () => {
      twa.MainButton.offClick(handler)
      twa.MainButton.hide()
      window.dispatchEvent(new CustomEvent('tg-main-btn-hide'))
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
