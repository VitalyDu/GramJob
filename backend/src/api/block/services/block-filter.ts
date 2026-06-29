import type { Core } from '@strapi/strapi'

export async function getBlockedUserIds(strapi: Core.Strapi, userId: number): Promise<number[]> {
  const blocks = await (strapi.documents as any)('api::block.block').findMany({
    filters: { user: { id: { $eq: userId } } },
    fields: ['targetId'],
    limit: 1000,
  })
  return blocks.map((b: any) => b.targetId as number)
}
