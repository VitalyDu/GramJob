import type { Core } from '@strapi/strapi'

const START_TIME = Date.now()

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async check(ctx: any) {
    let dbOk = false
    try {
      await strapi.db.connection.raw('SELECT 1')
      dbOk = true
    } catch {
      // dbOk stays false
    }

    ctx.status = dbOk ? 200 : 503
    ctx.body = {
      status: dbOk ? 'ok' : 'degraded',
      uptimeMs: Date.now() - START_TIME,
      db: dbOk,
      timestamp: new Date().toISOString(),
    }
  },
})
