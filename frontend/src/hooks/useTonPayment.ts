'use client'

import { useState, useCallback } from 'react'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { useStores } from '@/stores/StoreProvider'
import { buildJettonTransferBody } from '@/lib/ton-transfer'
import type { TonPaymentKind } from '@/types/api'

type Phase =
  | 'idle'
  | 'creating'
  | 'awaiting_signature'
  | 'awaiting_confirmation'
  | 'success'
  | 'error'

export function useTonPayment() {
  const [tonConnectUI] = useTonConnectUI()
  const senderAddress = useTonAddress()
  const { tonPayment, auth } = useStores()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const pay = useCallback(
    async (
      kind: TonPaymentKind,
      params: { planCode?: string; packageId?: number; vacancyId?: string },
      onSuccess?: () => void | Promise<void>
    ): Promise<void> => {
      try {
        setError(null)
        if (!senderAddress) {
          setPhase('awaiting_signature')
          await tonConnectUI.openModal()
          return
        }

        setPhase('creating')
        const intent = await tonPayment.createIntent({ kind, ...params })
        const { intentId, txParams } = intent

        // Resolve sender's USDT jetton wallet address via TonAPI
        const senderJettonWallet = await resolveJettonWalletAddress(
          txParams.usdtMaster,
          senderAddress
        )

        const body = buildJettonTransferBody({
          jettonAmountNano: BigInt(txParams.usdtNanoAmount),
          toAddress: txParams.merchantAddress,
          responseAddress: senderAddress,
          comment: intentId,
        })

        setPhase('awaiting_signature')
        await tonConnectUI.sendTransaction({
          validUntil: txParams.validUntil,
          messages: [
            {
              address: senderJettonWallet,
              amount: '50000000', // 0.05 TON for gas
              payload: body,
            },
          ],
        })

        setPhase('awaiting_confirmation')
        const status = await tonPayment.pollIntentStatus(intentId)
        if (status.status === 'completed') {
          setPhase('success')
          await auth.fetchMe()
          await onSuccess?.()
        } else {
          setPhase('error')
          setError('Оплата не подтверждена')
        }
      } catch (err) {
        setPhase('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [tonConnectUI, senderAddress, tonPayment, auth]
  )

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
  }, [])

  return { phase, error, pay, reset }
}

async function resolveJettonWalletAddress(jettonMaster: string, owner: string): Promise<string> {
  const url = `https://tonapi.io/v2/accounts/${owner}/jettons/${jettonMaster}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to resolve jetton wallet: ${res.status}`)
  const data = (await res.json()) as { wallet_address?: { address?: string } }
  const addr = data.wallet_address?.address
  if (!addr) throw new Error('Jetton wallet not found — пополните USDT баланс в кошельке')
  return addr
}
