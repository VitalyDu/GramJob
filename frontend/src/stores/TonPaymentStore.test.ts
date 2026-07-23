import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TonPaymentStore } from './TonPaymentStore'

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import { api } from '@/services/api'

describe('TonPaymentStore', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('createIntent posts kind + params, stores currentIntent', async () => {
    const mockResponse = {
      intentId: 'gj-x',
      txParams: {
        messages: [],
        validUntil: 9999,
        usdtNanoAmount: '1300000',
        merchantAddress: 'EQ...',
        usdtMaster: 'EQ...',
      },
    }
    vi.mocked(api.post).mockResolvedValue(mockResponse)

    const store = new TonPaymentStore()
    const res = await store.createIntent({ kind: 'subscription', planCode: 'pro' })

    expect(api.post).toHaveBeenCalledWith('/payments/ton/intent', {
      kind: 'subscription',
      planCode: 'pro',
    })
    expect(res.intentId).toBe('gj-x')
    expect(store.currentIntent?.intentId).toBe('gj-x')
  })

  it('pollIntentStatus resolves when status becomes completed', async () => {
    let calls = 0
    vi.mocked(api.get).mockImplementation(() => {
      calls++
      return Promise.resolve({ status: calls < 3 ? 'processing' : 'completed', tonTxHash: 'abc' })
    })

    const store = new TonPaymentStore()
    const status = await store.pollIntentStatus('gj-x', { intervalMs: 5, timeoutMs: 5000 })
    expect(status.status).toBe('completed')
    expect(calls).toBeGreaterThanOrEqual(3)
  })

  it('pollIntentStatus rejects on timeout', async () => {
    vi.mocked(api.get).mockResolvedValue({ status: 'processing', tonTxHash: null })

    const store = new TonPaymentStore()
    await expect(store.pollIntentStatus('gj-x', { intervalMs: 5, timeoutMs: 20 })).rejects.toThrow(
      /timeout/i
    )
  })
})
