export type InvoicePayload =
  | { type: 'subscription'; planCode: string; userId: number }
  | { type: 'vacancy_pack'; packageId: number; userId: number }
  | { type: 'apply_pack'; packageId: number; userId: number }

export function buildTelegramApiUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`
}

export function buildInvoicePayload(data: InvoicePayload): string {
  return JSON.stringify(data)
}

export function parseInvoicePayload(raw: string): InvoicePayload {
  const parsed = JSON.parse(raw) as InvoicePayload
  if (!parsed.type || !parsed.userId) {
    throw new Error('Invalid invoice payload: missing type or userId')
  }
  return parsed
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  return token
}

async function telegramCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const url = buildTelegramApiUrl(getBotToken(), method)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const json = (await res.json()) as { ok: boolean; result: T; description?: string }
  if (!json.ok) {
    throw new Error(`Telegram API error [${method}]: ${json.description ?? 'unknown error'}`)
  }
  return json.result
}

export async function createInvoiceLink(params: {
  title: string
  description: string
  payload: InvoicePayload
  starsAmount: number
}): Promise<string> {
  return telegramCall<string>('createInvoiceLink', {
    title: params.title,
    description: params.description,
    payload: buildInvoicePayload(params.payload),
    currency: 'XTR',
    prices: [{ label: params.title, amount: params.starsAmount }],
  })
}

export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  await telegramCall<boolean>('answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  })
}

export async function setWebhook(url: string, secretToken?: string): Promise<void> {
  await telegramCall<boolean>('setWebhook', {
    url,
    ...(secretToken ? { secret_token: secretToken } : {}),
    allowed_updates: ['message', 'pre_checkout_query'],
  })
}
