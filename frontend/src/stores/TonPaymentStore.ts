import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '@/services/api'
import type { TonPaymentKind, TonPaymentIntentResponse, TonIntentStatusResponse } from '@/types/api'

export class TonPaymentStore {
  currentIntent: TonPaymentIntentResponse | null = null
  isPolling = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async createIntent(params: {
    kind: TonPaymentKind
    planCode?: string
    packageId?: number
    vacancyId?: string
  }): Promise<TonPaymentIntentResponse> {
    const body: Record<string, unknown> = { kind: params.kind }
    if (params.planCode !== undefined) body.planCode = params.planCode
    if (params.packageId !== undefined) body.packageId = params.packageId
    if (params.vacancyId !== undefined) body.vacancyId = params.vacancyId

    const res = await api.post<TonPaymentIntentResponse>('/payments/ton/intent', body)
    runInAction(() => {
      this.currentIntent = res
      this.error = null
    })
    return res
  }

  async pollIntentStatus(
    intentId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<TonIntentStatusResponse> {
    const intervalMs = opts.intervalMs ?? 3000
    const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000
    const deadline = Date.now() + timeoutMs

    runInAction(() => {
      this.isPolling = true
    })
    try {
      while (Date.now() < deadline) {
        const res = await api.get<TonIntentStatusResponse>(`/payments/ton/intent/${intentId}`)
        if (res.status === 'completed' || res.status === 'failed') {
          return res
        }
        await new Promise((r) => setTimeout(r, intervalMs))
      }
      throw new Error('Payment confirmation timeout')
    } finally {
      runInAction(() => {
        this.isPolling = false
      })
    }
  }

  clearIntent(): void {
    this.currentIntent = null
    this.error = null
  }
}
