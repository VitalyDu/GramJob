import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { StartParamRouter } from './StartParamRouter'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

function mockTelegram(startParam?: string) {
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: {
      initData: 'user=1',
      initDataUnsafe: {
        ...(startParam ? { start_param: startParam } : {}),
        auth_date: 1,
        hash: 'h',
      },
    },
  }
}

describe('StartParamRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
  })

  it('редиректит по start_param=vacancy_abc', () => {
    mockTelegram('vacancy_abc')
    render(<StartParamRouter />)
    expect(mockReplace).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/vacancies/abc')
  })

  it('редиректит только один раз при повторном рендере', () => {
    mockTelegram('subscription')
    const { rerender } = render(<StartParamRouter />)
    rerender(<StartParamRouter />)
    expect(mockReplace).toHaveBeenCalledTimes(1)
  })

  it('без start_param не редиректит', () => {
    mockTelegram()
    render(<StartParamRouter />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('вне Mini App не редиректит', () => {
    render(<StartParamRouter />)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
