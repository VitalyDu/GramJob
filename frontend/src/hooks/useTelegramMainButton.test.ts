import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTelegramMainButton } from './useTelegramMainButton'

function mockTelegramMainButton() {
  const MainButton = {
    text: '',
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    showProgress: vi.fn(),
    hideProgress: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', MainButton },
  }
  return MainButton
}

describe('useTelegramMainButton', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
    vi.clearAllMocks()
  })

  it('в Mini App показывает кнопку, ставит текст и возвращает true', async () => {
    const mb = mockTelegramMainButton()
    const onClick = vi.fn()
    const { result } = renderHook(() => useTelegramMainButton({ text: 'Сохранить', onClick }))
    await waitFor(() => expect(result.current).toBe(true))
    expect(mb.show).toHaveBeenCalled()
    expect(mb.text).toBe('Сохранить')
    const handler = mb.onClick.mock.calls[0]?.[0] as () => void
    handler()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled=true вызывает disable', async () => {
    const mb = mockTelegramMainButton()
    renderHook(() => useTelegramMainButton({ text: 'X', onClick: vi.fn(), disabled: true }))
    await waitFor(() => expect(mb.disable).toHaveBeenCalled())
  })

  it('visible=false не показывает кнопку', async () => {
    const mb = mockTelegramMainButton()
    const { result } = renderHook(() =>
      useTelegramMainButton({ text: 'X', onClick: vi.fn(), visible: false })
    )
    await waitFor(() => expect(result.current).toBe(true))
    expect(mb.show).not.toHaveBeenCalled()
  })

  it('при unmount снимает обработчик и прячет кнопку', async () => {
    const mb = mockTelegramMainButton()
    const { unmount, result } = renderHook(() =>
      useTelegramMainButton({ text: 'X', onClick: vi.fn() })
    )
    await waitFor(() => expect(result.current).toBe(true))
    unmount()
    expect(mb.offClick).toHaveBeenCalledOnce()
    expect(mb.hide).toHaveBeenCalled()
  })

  it('вне Mini App возвращает false и не падает', () => {
    const { result } = renderHook(() => useTelegramMainButton({ text: 'X', onClick: vi.fn() }))
    expect(result.current).toBe(false)
  })
})
