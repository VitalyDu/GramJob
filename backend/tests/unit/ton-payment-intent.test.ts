import { buildTransactionParams } from '../../src/api/payment/services/ton-payment'

describe('buildTransactionParams', () => {
  const origMerchant = process.env.TON_MERCHANT_ADDRESS
  const origNetwork = process.env.TON_NETWORK

  beforeEach(() => {
    process.env.TON_MERCHANT_ADDRESS = 'EQTestMerchantAddress0000000000000000000000000000000'
    process.env.TON_NETWORK = 'mainnet'
  })

  afterEach(() => {
    if (origMerchant) process.env.TON_MERCHANT_ADDRESS = origMerchant
    else delete process.env.TON_MERCHANT_ADDRESS
    if (origNetwork) process.env.TON_NETWORK = origNetwork
    else delete process.env.TON_NETWORK
  })

  it('returns TON Connect transaction params', () => {
    const params = buildTransactionParams({
      intentId: 'gj-11111111-2222-3333-4444-555555555555',
      starsPrice: 299,
    })

    expect(params.validUntil).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(params.messages).toHaveLength(1)
    const msg = params.messages[0]
    expect(msg.amount).toBe('50000000')
    expect(msg.address).toBe('EQTestMerchantAddress0000000000000000000000000000000')
    expect(params.usdtNanoAmount).toBe('3887000')
    expect(params.merchantAddress).toBe('EQTestMerchantAddress0000000000000000000000000000000')
    expect(params.usdtMaster).toBe('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs')
  })

  it('throws if TON_MERCHANT_ADDRESS not set', () => {
    delete process.env.TON_MERCHANT_ADDRESS
    expect(() => buildTransactionParams({ intentId: 'gj-x', starsPrice: 299 })).toThrow(
      'TON_MERCHANT_ADDRESS'
    )
  })
})
