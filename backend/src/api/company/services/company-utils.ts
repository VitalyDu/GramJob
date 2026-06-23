export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function canSubmit(status: string): boolean {
  return status === 'draft'
}

export function canDelete(activeVacancyCount: number): boolean {
  return activeVacancyCount === 0
}
