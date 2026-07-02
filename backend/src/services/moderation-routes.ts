import type { Core } from '@strapi/strapi'
import { isModeratableEntity, validateRejection, type RejectionReason } from './moderation-utils'
import {
  approveEntity,
  rejectEntity,
  decideReport,
  getModerationStats,
  type AdminModerator,
  type ModerationResult,
} from './moderation.service'

const ADMIN_CONFIG = { policies: ['admin::isAuthenticatedAdmin'] }
const EMPTY_INFO = {} as const

function sendResult(ctx: any, result: ModerationResult) {
  if (result.ok) {
    ctx.send({ ok: true })
    return
  }
  if (result.code === 'NOT_FOUND') {
    ctx.notFound('Entity not found')
    return
  }
  ctx.send({ ok: false, error: 'INVALID_STATUS' }, 409)
}

export function registerModerationRoutes(strapi: Core.Strapi) {
  strapi.server.routes({
    type: 'admin',
    prefix: '/moderation',
    routes: [
      {
        method: 'POST',
        path: '/:entityType/:documentId/approve',
        info: EMPTY_INFO,
        handler: async (ctx: any) => {
          const { entityType, documentId } = ctx.params as {
            entityType: string
            documentId: string
          }
          if (!isModeratableEntity(entityType)) {
            return ctx.badRequest('Unknown entity type')
          }
          const result = await approveEntity(
            strapi,
            entityType,
            documentId,
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'POST',
        path: '/:entityType/:documentId/reject',
        info: EMPTY_INFO,
        handler: async (ctx: any) => {
          const { entityType, documentId } = ctx.params as {
            entityType: string
            documentId: string
          }
          if (!isModeratableEntity(entityType)) {
            return ctx.badRequest('Unknown entity type')
          }
          const body = (ctx.request.body ?? {}) as { reason?: unknown; comment?: unknown }
          const validationError = validateRejection(body.reason, body.comment)
          if (validationError) {
            return ctx.badRequest(validationError)
          }
          const comment =
            typeof body.comment === 'string' && body.comment.trim().length > 0
              ? body.comment.trim()
              : undefined
          const result = await rejectEntity(
            strapi,
            entityType,
            documentId,
            body.reason as RejectionReason,
            comment,
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'POST',
        path: '/reports/:documentId/resolve',
        info: EMPTY_INFO,
        handler: async (ctx: any) => {
          const result = await decideReport(
            strapi,
            (ctx.params as { documentId: string }).documentId,
            'resolved',
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'POST',
        path: '/reports/:documentId/dismiss',
        info: EMPTY_INFO,
        handler: async (ctx: any) => {
          const result = await decideReport(
            strapi,
            (ctx.params as { documentId: string }).documentId,
            'dismissed',
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'GET',
        path: '/stats',
        info: EMPTY_INFO,
        handler: async (ctx: any) => {
          ctx.send(await getModerationStats(strapi))
        },
        config: ADMIN_CONFIG,
      },
    ],
  })
}
