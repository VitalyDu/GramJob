import type { Core } from '@strapi/strapi'

export interface BlockedIds {
  userIds: number[]
  companyIds: number[]
}

export async function getBlockedIds(strapi: Core.Strapi, userId: number): Promise<BlockedIds> {
  const blocks = await (strapi.documents as any)('api::block.block').findMany({
    filters: { user: { id: { $eq: userId } } },
    fields: ['targetType', 'targetId'],
    limit: 1000,
  })
  const userIds: number[] = []
  const companyIds: number[] = []
  for (const b of blocks) {
    if (b.targetType === 'company') {
      companyIds.push(b.targetId as number)
    } else {
      userIds.push(b.targetId as number)
    }
  }
  return { userIds, companyIds }
}

/** @deprecated use getBlockedIds */
export async function getBlockedUserIds(strapi: Core.Strapi, userId: number): Promise<number[]> {
  const { userIds } = await getBlockedIds(strapi, userId)
  return userIds
}
