export function canPublishResume(status: string): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canEditResume(status: string): boolean {
  return ['draft', 'rejected', 'published', 'moderation'].includes(status)
}

export function canArchiveResume(status: string): boolean {
  return ['draft', 'moderation', 'published', 'rejected'].includes(status)
}
