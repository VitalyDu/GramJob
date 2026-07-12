'use client'

import { useEffect, useState } from 'react'

function isTextInputEl(el: Element): boolean {
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const t = (el as HTMLInputElement).type.toLowerCase()
    return ![
      'checkbox',
      'radio',
      'button',
      'submit',
      'reset',
      'file',
      'image',
      'range',
      'color',
    ].includes(t)
  }
  return (el as HTMLElement).isContentEditable
}

/**
 * Global keyboard-awareness hook:
 * - sets isKeyboardOpen when a text input receives focus (used to hide BottomNav)
 */
export function useKeyboardBehavior() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof Element) || !isTextInputEl(e.target)) return
      setIsKeyboardOpen(true)
    }

    const onFocusOut = (e: FocusEvent) => {
      if (!(e.target instanceof Element) || !isTextInputEl(e.target)) return
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (!active || !isTextInputEl(active)) setIsKeyboardOpen(false)
      })
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return { isKeyboardOpen }
}
