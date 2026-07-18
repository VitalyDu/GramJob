export type TelegramUsernameChange = {
  needsUpdate: boolean
  value: string | null
}

// Compares stored telegramUsername against what Telegram sent in this auth call.
// Missing/empty on either side is normalized to null so we don't rewrite the row
// when nothing effectively changed (e.g. undefined vs. null).
export function computeTelegramUsernameUpdate(
  currentInDb: string | null | undefined,
  incomingFromTelegram: string | null | undefined
): TelegramUsernameChange {
  const normalizedIncoming =
    incomingFromTelegram && incomingFromTelegram.length > 0 ? incomingFromTelegram : null
  const normalizedCurrent = currentInDb && currentInDb.length > 0 ? currentInDb : null
  return {
    needsUpdate: normalizedCurrent !== normalizedIncoming,
    value: normalizedIncoming,
  }
}
