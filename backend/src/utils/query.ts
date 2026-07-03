export function toArray(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return [value]
}
