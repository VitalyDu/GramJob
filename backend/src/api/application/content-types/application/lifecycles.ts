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
    const s = globalThis.strapi
    s.log.info(`[application] New application ${event.result.documentId} created`)
    // applicationsCount is incremented in the controller where the vacancy documentId is known
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
