import { describe, it, expect } from 'vitest'
import { buildJettonTransferBody } from './ton-transfer'

describe('buildJettonTransferBody', () => {
  it('returns base64 string for a real jetton transfer', () => {
    const boc = buildJettonTransferBody({
      jettonAmountNano: BigInt(1_000_000),
      toAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
      responseAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
      comment: 'gj-11111111-2222-3333-4444-555555555555',
    })
    expect(typeof boc).toBe('string')
    expect(boc.length).toBeGreaterThan(50)
    expect(boc).toMatch(/^[A-Za-z0-9+/=]+$/)
  })
})
