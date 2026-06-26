export function canPublish(status: string): boolean {
  return status === 'draft' || status === 'rejected' || status === 'expired'
}

export function canBoost(status: string): boolean {
  return status === 'published'
}

export function canArchive(status: string): boolean {
  return ['draft', 'published', 'rejected', 'expired'].includes(status)
}

export function canEdit(status: string): boolean {
  return ['draft', 'rejected', 'published'].includes(status)
}

export function publishedTransitionsOnEdit(status: string): boolean {
  return status === 'published'
}
