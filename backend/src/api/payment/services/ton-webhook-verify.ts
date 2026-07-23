import crypto from 'crypto'

export function verifyTonPayWebhookSignature(
  rawBody: string,
  incomingSignatureHex: string,
  secret: string
): boolean {
  if (!incomingSignatureHex || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(incomingSignatureHex, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
