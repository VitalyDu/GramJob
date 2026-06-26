type ResumeAfterEvent = {
  result: { documentId?: string; status?: string }
  params: unknown
}

export default {
  async afterUpdate(event: ResumeAfterEvent) {
    if (event.result.status === 'published') {
      const s = globalThis.strapi
      s.log.info(`[resume] Resume ${event.result.documentId} published`)
      // TODO Sprint 7: send Telegram notification to resume.user
    }
  },
}
