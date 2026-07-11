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

// Scrolls the focused element into view above the virtual keyboard using visualViewport.
function scrollInputIntoView(el: HTMLElement) {
  const vv = window.visualViewport
  if (!vv) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return null
  }
  let cancelled = false
  const check = () => {
    if (cancelled) return
    const rect = el.getBoundingClientRect()
    const visibleBottom = vv.offsetTop + vv.height - 16
    if (rect.bottom > visibleBottom) {
      window.scrollBy({ top: rect.bottom - visibleBottom, behavior: 'smooth' })
    }
  }
  // Check twice: immediately + after keyboard animation (~300 ms on iOS)
  setTimeout(check, 50)
  setTimeout(check, 350)
  return () => {
    cancelled = true
  }
}

/**
 * Global keyboard-awareness hook:
 * - sets isKeyboardOpen when a text input receives focus
 * - scrolls focused input above the virtual keyboard
 * - dismisses the keyboard (blurs active input) when the user scrolls on mobile
 */
export function useKeyboardBehavior() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Prevent the scroll-to-dismiss listener from firing during our own scrollBy calls.
    let isProgrammaticScroll = false
    let cancelPrevScroll: (() => void) | null = null

    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof Element) || !isTextInputEl(e.target)) return
      setIsKeyboardOpen(true)
      cancelPrevScroll?.()
      cancelPrevScroll = scrollInputIntoView(e.target as HTMLElement)
      isProgrammaticScroll = true
      // Give our own scrollBy a window to complete before re-enabling dismiss-on-scroll.
      setTimeout(() => {
        isProgrammaticScroll = false
      }, 700)
    }

    const onFocusOut = (e: FocusEvent) => {
      if (!(e.target instanceof Element) || !isTextInputEl(e.target)) return
      // Delay one frame: focus may be moving to another text input on the same page.
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (!active || !isTextInputEl(active)) setIsKeyboardOpen(false)
      })
    }

    const onScroll = () => {
      if (isProgrammaticScroll) return
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || !isTextInputEl(active)) return
      // Only dismiss on mobile where a virtual keyboard actually shrinks the viewport.
      const vv = window.visualViewport
      if (!vv || vv.height >= window.innerHeight * 0.85) return
      active.blur()
    }

    // Re-check scroll position when viewport resizes (keyboard animates in/out).
    const onViewportResize = () => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || !isTextInputEl(active)) return
      cancelPrevScroll?.()
      cancelPrevScroll = scrollInputIntoView(active)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.visualViewport?.addEventListener('resize', onViewportResize)

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.visualViewport?.removeEventListener('resize', onViewportResize)
    }
  }, [])

  return { isKeyboardOpen }
}
