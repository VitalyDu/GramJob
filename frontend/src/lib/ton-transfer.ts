import { Address, beginCell, toNano } from '@ton/core'

export interface JettonTransferParams {
  jettonAmountNano: bigint
  toAddress: string // merchant TON address
  responseAddress: string // usually sender's own wallet
  forwardTonAmount?: bigint
  comment?: string // intentId as memo
}

/**
 * Builds the internal message body for a jetton transfer (op 0xf8a7ea5).
 * Result is base64-encoded BOC to pass as messages[0].payload in TonConnect.
 * messages[0].address must be the sender's jetton wallet for the USDT master.
 */
export function buildJettonTransferBody(params: JettonTransferParams): string {
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32) // op = jetton transfer
    .storeUint(0, 64) // query id
    .storeCoins(params.jettonAmountNano)
    .storeAddress(Address.parse(params.toAddress))
    .storeAddress(Address.parse(params.responseAddress))
    .storeBit(false) // no custom payload
    .storeCoins(params.forwardTonAmount ?? toNano('0.01'))
    .storeBit(true) // forward payload as ref
    .storeRef(
      params.comment
        ? beginCell().storeUint(0, 32).storeStringTail(params.comment).endCell()
        : beginCell().endCell()
    )
    .endCell()

  return body.toBoc().toString('base64')
}
