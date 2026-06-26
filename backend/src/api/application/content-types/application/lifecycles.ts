type ApplicationAfterEvent = {
  result: {
    id?: number
    documentId?: string
    status?: string
    vacancy?: { id?: number; documentId?: string }
  }
  params: unknown
}

export default {
  async afterCreate(event: ApplicationAfterEvent) {
    const vacancyId = event.result.vacancy?.id
    if (!vacancyId) return

    const s = globalThis.strapi

    // Increment applicationsCount on the related vacancy
    try {
      await s.db.connection.raw(
        `UPDATE vacancies SET applications_count = applications_count + 1 WHERE id = ?`,
        [vacancyId]
      )
    } catch {
      s.log.warn(`[application] Failed to increment applicationsCount for vacancy id=${vacancyId}`)
    }

    s.log.info(
      `[application] New application ${event.result.documentId} for vacancy id=${vacancyId}`
    )
    // TODO Sprint 7: send NewApplication Telegram notification to vacancy.postedBy
  },

  async afterUpdate(event: ApplicationAfterEvent) {
    const s = globalThis.strapi
    s.log.info(
      `[application] Application ${event.result.documentId} status → ${event.result.status}`
    )
    // TODO Sprint 7: send status-change Telegram notification to application.user
  },
}
