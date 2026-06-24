import type { Core } from '@strapi/strapi'

type CompanyWithOwner = { owner: { id: number } | null }

export function checkIsOwner(company: CompanyWithOwner, userId: number): boolean {
  return company.owner?.id === userId
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const { id } = ctx.params as { id: string }

  const company = await strapi.documents('api::company.company').findOne({
    documentId: id,
    populate: { owner: { fields: ['id'] } },
  })

  if (!company) return false

  return checkIsOwner(company as CompanyWithOwner, user.id)
}
