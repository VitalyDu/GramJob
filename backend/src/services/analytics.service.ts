export function computeDelta(current: number, prevTotal: number): number {
  return Math.max(0, current - prevTotal)
}

export function yesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
