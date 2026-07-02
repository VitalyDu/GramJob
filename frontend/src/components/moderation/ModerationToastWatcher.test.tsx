import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const apiGet = vi.fn()
vi.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
}))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: { isAuthenticated: true } }),
}))

import { ModerationToastWatcher } from './ModerationToastWatcher'

function notif(documentId: string, type: string) {
  return {
    documentId,
    type,
    title: `t-${documentId}`,
    body: `b-${documentId}`,
    isRead: false,
    createdAt: '2026-07-02T00:00:00.000Z',
  }
}

describe('ModerationToastWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toastSuccess.mockClear()
    toastError.mockClear()
    apiGet.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('не показывает toast для уведомлений из первого опроса', async () => {
    apiGet.mockResolvedValue({ data: [notif('n1', 'moderation_rejected')] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('показывает toast для нового moderation-уведомления в последующих опросах', async () => {
    apiGet.mockResolvedValueOnce({ data: [] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    apiGet.mockResolvedValueOnce({ data: [notif('n2', 'moderation_approved')] })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(toastSuccess).toHaveBeenCalledWith('t-n2', { description: 'b-n2' })
  })

  it('не дублирует toast для уже показанного уведомления', async () => {
    apiGet.mockResolvedValueOnce({ data: [] })
    apiGet.mockResolvedValue({ data: [notif('n3', 'moderation_rejected')] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(toastError).toHaveBeenCalledTimes(1)
  })

  it('игнорирует уведомления других типов', async () => {
    apiGet.mockResolvedValueOnce({ data: [] })
    apiGet.mockResolvedValueOnce({ data: [notif('n4', 'new_application')] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })
})
