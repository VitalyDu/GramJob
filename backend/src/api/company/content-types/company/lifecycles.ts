import type { Core } from '@strapi/strapi'

type CompanyLifecycleEvent = {
  result: {
    status?: string
    documentId?: string
  }
  params: unknown
}

export default {
  async afterUpdate(event: CompanyLifecycleEvent, { strapi }: { strapi: Core.Strapi }) {
    if (event.result.status === 'published') {
      // TODO: send Telegram notification to company owner (Sprint 3)
      strapi.log.info(`[company] Company ${event.result.documentId} published`)
    }
  },
}
