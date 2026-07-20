/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTelegramPaymentDialog } from './useTelegramPaymentDialog'

describe('useTelegramPaymentDialog', () => {
  beforeEach(() => {
    ;(window as any).Telegram = undefined
  })
  afterEach(() => {
    ;(window as any).Telegram = undefined
  })

  it('shows loading, then ready when createInvoice resolves (web mode)', async () => {
    const createInvoice = vi.fn().mockResolvedValue('https://t.me/$abc')
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice)
    })
    expect(result.current.state).toBe('loading')
    expect(result.current.open).toBe(true)

    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(result.current.invoiceUrl).toBe('https://t.me/$abc')
  })

  it('shows error state when createInvoice rejects', async () => {
    const createInvoice = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice)
    })
    await waitFor(() => expect(result.current.state).toBe('error'))
    expect(result.current.errorMessage).toBe('boom')
  })

  it('opens native invoice in Mini App mode and does not show dialog', async () => {
    const openInvoice = vi.fn()
    // Real Mini App context requires initData to be populated; the invoice
    // method itself was added in Bot API 6.1, so isVersionAtLeast must agree.
    ;(window as any).Telegram = {
      WebApp: { openInvoice, initData: 'mock-init', isVersionAtLeast: () => true },
    }

    const createInvoice = vi.fn().mockResolvedValue('https://t.me/$xyz')
    const onPaid = vi.fn()
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice, onPaid)
    })
    await waitFor(() =>
      expect(openInvoice).toHaveBeenCalledWith('https://t.me/$xyz', expect.any(Function))
    )
    expect(result.current.open).toBe(false)

    const cb = openInvoice.mock.calls[0]![1]
    act(() => cb('paid'))
    expect(onPaid).toHaveBeenCalledOnce()
  })

  it('falls back to web dialog when in Mini App but Bot API version < 6.1', async () => {
    const openInvoice = vi.fn()
    ;(window as any).Telegram = {
      WebApp: { openInvoice, initData: 'mock-init', isVersionAtLeast: () => false },
    }

    const createInvoice = vi.fn().mockResolvedValue('https://t.me/$old')
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice)
    })
    expect(result.current.open).toBe(true)
    expect(result.current.state).toBe('loading')

    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(openInvoice).not.toHaveBeenCalled()
  })

  it('close() resets state', async () => {
    const { result } = renderHook(() => useTelegramPaymentDialog())
    act(() => {
      result.current.start(() => Promise.resolve('https://t.me/$q'))
    })
    await waitFor(() => expect(result.current.state).toBe('ready'))

    act(() => {
      result.current.close()
    })
    expect(result.current.open).toBe(false)
  })

  it('retry() re-runs the last createInvoice with the same onPaid', async () => {
    const createInvoice = vi
      .fn()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValueOnce('https://t.me/$second')
    const onPaid = vi.fn()
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice, onPaid)
    })
    await waitFor(() => expect(result.current.state).toBe('error'))

    act(() => {
      result.current.retry()
    })
    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(result.current.invoiceUrl).toBe('https://t.me/$second')
    expect(createInvoice).toHaveBeenCalledTimes(2)
  })
})
