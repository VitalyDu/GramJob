import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTelegramBackButton } from './useTelegramBackButton'

const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
}))

function mockTelegramBackButton() {
  const BackButton = {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', BackButton },
  }
  return BackButton
}

describe('useTelegramBackButton', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
    vi.clearAllMocks()
  })

  it('показывает BackButton и навешивает обработчик router.back', () => {
    const bb = mockTelegramBackButton()
    renderHook(() => useTelegramBackButton())
    expect(bb.show).toHaveBeenCalledOnce()
    expect(bb.onClick).toHaveBeenCalledOnce()
    const handler = bb.onClick.mock.calls[0]?.[0] as () => void
    handler()
    expect(mockBack).toHaveBeenCalledOnce()
  })

  it('при unmount снимает обработчик и прячет кнопку', () => {
    const bb = mockTelegramBackButton()
    const { unmount } = renderHook(() => useTelegramBackButton())
    unmount()
    expect(bb.offClick).toHaveBeenCalledOnce()
    expect(bb.hide).toHaveBeenCalledOnce()
  })

  it('вне Mini App — no-op', () => {
    expect(() => renderHook(() => useTelegramBackButton())).not.toThrow()
  })
})
