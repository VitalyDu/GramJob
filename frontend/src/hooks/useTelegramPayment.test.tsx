/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { isTelegramMiniApp } from './useTelegramPayment'

describe('isTelegramMiniApp', () => {
  const originalTelegram = (globalThis as any).window?.Telegram

  afterEach(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).Telegram = originalTelegram
    }
  })

  it('returns false when window.Telegram is undefined', () => {
    ;(window as any).Telegram = undefined
    expect(isTelegramMiniApp()).toBe(false)
  })

  it('returns false when WebApp exists but openInvoice is missing (older SDK)', () => {
    ;(window as any).Telegram = { WebApp: { initData: 'x' } }
    expect(isTelegramMiniApp()).toBe(false)
  })

  it('returns true when WebApp.openInvoice is available', () => {
    ;(window as any).Telegram = { WebApp: { openInvoice: vi.fn() } }
    expect(isTelegramMiniApp()).toBe(true)
  })
})
