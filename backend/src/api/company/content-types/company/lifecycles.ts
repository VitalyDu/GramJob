import type { Core } from '@strapi/strapi'

type CompanyLifecycleEvent = {
  result: {
    status?: string
    documentId?: string
  }
  params: unknown
}

export default {
  async afterUpdate(event: CompanyLifecycleEvent) {
    if (event.result.status === 'published') {
      const s = globalThis.strapi as Core.Strapi
      // TODO: send Telegram notification to company owner (Sprint 3)
      s.log.info(`[company] Company ${event.result.documentId} published`)
    }
  },
}
