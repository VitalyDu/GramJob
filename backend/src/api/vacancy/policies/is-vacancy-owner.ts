import type { Core } from '@strapi/strapi'

type VacancyWithPostedBy = { postedBy: { id: number } | null | undefined }

export function checkIsOwner(vacancy: VacancyWithPostedBy, userId: number): boolean {
  return vacancy.postedBy?.id === userId
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const { id } = ctx.params as { id: string }

  const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
    documentId: id,
    populate: { postedBy: { fields: ['id'] } },
  })

  if (!vacancy) return false

  return checkIsOwner(vacancy as unknown as VacancyWithPostedBy, user.id)
}
