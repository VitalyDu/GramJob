export function canPublishResume(status: string): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canEditResume(status: string): boolean {
  return status === 'draft' || status === 'rejected' || status === 'published'
}

export function canArchiveResume(status: string): boolean {
  return ['draft', 'published', 'rejected'].includes(status)
}

export function publishedTransitionsOnEditResume(status: string): boolean {
  return status === 'published'
}
