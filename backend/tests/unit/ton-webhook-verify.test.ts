import crypto from 'crypto'
import { verifyTonPayWebhookSignature } from '../../src/api/payment/services/ton-webhook-verify'

const SECRET = 'test-secret'

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex')
}

describe('verifyTonPayWebhookSignature', () => {
  it('accepts a correctly signed payload', () => {
    const body = '{"intentId":"gj-x","txHash":"abc"}'
    const sig = sign(body)
    expect(verifyTonPayWebhookSignature(body, sig, SECRET)).toBe(true)
  })

  it('rejects a wrong signature', () => {
    const body = '{"a":1}'
    expect(verifyTonPayWebhookSignature(body, 'deadbeef', SECRET)).toBe(false)
  })

  it('rejects mismatched body', () => {
    const body = '{"a":1}'
    const sig = sign('{"a":2}')
    expect(verifyTonPayWebhookSignature(body, sig, SECRET)).toBe(false)
  })

  it('handles unequal length signatures without throwing', () => {
    const body = '{}'
    expect(verifyTonPayWebhookSignature(body, 'a', SECRET)).toBe(false)
  })
})
