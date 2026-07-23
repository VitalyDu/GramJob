export const STARS_TO_USDT_RATE = 0.013
export const USDT_DECIMALS = 6

export function calculateUsdtDisplayAmount(starsPrice: number): number {
  if (!Number.isFinite(starsPrice) || starsPrice <= 0) return 0
  return starsPrice * STARS_TO_USDT_RATE
}

export function calculateUsdtNanoAmount(starsPrice: number): bigint {
  return BigInt(Math.round(calculateUsdtDisplayAmount(starsPrice) * 10 ** USDT_DECIMALS))
}

export function formatUsdt(amount: number): string {
  return `$${amount.toFixed(2)}`
}
