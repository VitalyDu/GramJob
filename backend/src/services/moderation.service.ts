import type { Core } from '@strapi/strapi'
import {
  MODERATABLE_ENTITIES,
  computeAvgProcessingHours,
  type ModeratableEntityType,
  type RejectionReason,
} from './moderation-utils'

export interface AdminModerator {
  id: number
  firstname?: string | null
  lastname?: string | null
  email?: string | null
}

export type ModerationResult = { ok: true } | { ok: false; code: 'NOT_FOUND' | 'INVALID_STATUS' }

export interface ModerationStats {
  queue: { vacancies: number; resumes: number; companies: number; reports: number }
  avgProcessingHours: number | null
  decidedLast7Days: number
}

const TITLE_FIELDS: Record<ModeratableEntityType, string> = {
  vacancy: 'title',
  resume: 'title',
  company: 'name',
}

function moderatorName(moderator: AdminModerator): string {
  const name = [moderator.firstname, moderator.lastname].filter(Boolean).join(' ')
  return name || moderator.email || `admin#${moderator.id}`
}

interface LogEntry {
  entityType: 'vacancy' | 'resume' | 'company' | 'report'
  entityDocumentId: string
  entityTitle?: string
  action: 'submitted' | 'approved' | 'rejected' | 'report_resolved' | 'report_dismissed'
  reason?: string
  comment?: string
  moderator?: AdminModerator
}

export async function logModeration(strapi: Core.Strapi, entry: LogEntry): Promise<void> {
  try {
    await (strapi.documents as any)('api::moderation-log.moderation-log').create({
      data: {
        entityType: entry.entityType,
        entityDocumentId: entry.entityDocumentId,
        entityTitle: entry.entityTitle ?? null,
        action: entry.action,
        reason: entry.reason ?? null,
        comment: entry.comment ?? null,
        moderatorId: entry.moderator?.id ?? null,
        moderatorName: entry.moderator ? moderatorName(entry.moderator) : null,
      },
    })
  } catch (err) {
    strapi.log.error('[moderation] Failed to write moderation log', err)
  }
}

export async function approveEntity(
  strapi: Core.Strapi,
  entityType: ModeratableEntityType,
  documentId: string,
  moderator: AdminModerator
): Promise<ModerationResult> {
  const uid = MODERATABLE_ENTITIES[entityType]
  const titleField = TITLE_FIELDS[entityType]

  const doc = await (strapi.documents as any)(uid).findOne({
    documentId,
    fields: ['documentId', 'moderationStatus', titleField],
  })
  if (!doc) return { ok: false, code: 'NOT_FOUND' }
  if (doc.moderationStatus !== 'moderation') return { ok: false, code: 'INVALID_STATUS' }

  await (strapi.documents as any)(uid).update({
    documentId,
    data: { moderationStatus: 'published', rejectionReason: null, rejectionComment: null },
  })

  await logModeration(strapi, {
    entityType,
    entityDocumentId: documentId,
    entityTitle: doc[titleField] ?? '',
    action: 'approved',
    moderator,
  })
  return { ok: true }
}

export async function rejectEntity(
  strapi: Core.Strapi,
  entityType: ModeratableEntityType,
  documentId: string,
  reason: RejectionReason,
  comment: string | undefined,
  moderator: AdminModerator
): Promise<ModerationResult> {
  const uid = MODERATABLE_ENTITIES[entityType]
  const titleField = TITLE_FIELDS[entityType]

  const doc = await (strapi.documents as any)(uid).findOne({
    documentId,
    fields: ['documentId', 'moderationStatus', titleField],
  })
  if (!doc) return { ok: false, code: 'NOT_FOUND' }
  if (doc.moderationStatus !== 'moderation') return { ok: false, code: 'INVALID_STATUS' }

  await (strapi.documents as any)(uid).update({
    documentId,
    data: {
      moderationStatus: 'rejected',
      rejectionReason: reason,
      rejectionComment: comment ?? null,
    },
  })

  await logModeration(strapi, {
    entityType,
    entityDocumentId: documentId,
    entityTitle: doc[titleField] ?? '',
    action: 'rejected',
    reason,
    ...(comment ? { comment } : {}),
    moderator,
  })
  return { ok: true }
}

export async function decideReport(
  strapi: Core.Strapi,
  documentId: string,
  decision: 'resolved' | 'dismissed',
  moderator: AdminModerator
): Promise<ModerationResult> {
  const report = await (strapi.documents as any)('api::report.report').findOne({
    documentId,
    fields: ['documentId', 'status', 'type', 'targetId'],
  })
  if (!report) return { ok: false, code: 'NOT_FOUND' }
  if (report.status !== 'pending') return { ok: false, code: 'INVALID_STATUS' }

  await (strapi.documents as any)('api::report.report').update({
    documentId,
    data: { status: decision },
  })

  await logModeration(strapi, {
    entityType: 'report',
    entityDocumentId: documentId,
    entityTitle: `${report.type}#${report.targetId}`,
    action: decision === 'resolved' ? 'report_resolved' : 'report_dismissed',
    moderator,
  })
  return { ok: true }
}

export async function getModerationStats(strapi: Core.Strapi): Promise<ModerationStats> {
  const countInModeration = (uid: string) =>
    (strapi.documents as any)(uid).count({ filters: { moderationStatus: 'moderation' } })

  const weekAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString()

  const [vacancies, resumes, companies, reports, logs, decidedLast7Days] = await Promise.all([
    countInModeration('api::vacancy.vacancy'),
    countInModeration('api::resume.resume'),
    countInModeration('api::company.company'),
    (strapi.documents as any)('api::report.report').count({
      filters: { status: 'pending' },
    }),
    (strapi.documents as any)('api::moderation-log.moderation-log').findMany({
      filters: {
        action: { $in: ['submitted', 'approved', 'rejected'] },
        createdAt: { $gte: monthAgo },
      },
      fields: ['entityType', 'entityDocumentId', 'action', 'createdAt'],
      sort: 'createdAt:desc',
      limit: 2000,
    }),
    (strapi.documents as any)('api::moderation-log.moderation-log').count({
      filters: {
        action: { $in: ['approved', 'rejected'] },
        createdAt: { $gte: weekAgo },
      },
    }),
  ])

  return {
    queue: { vacancies, resumes, companies, reports },
    avgProcessingHours: computeAvgProcessingHours(logs),
    decidedLast7Days,
  }
}
