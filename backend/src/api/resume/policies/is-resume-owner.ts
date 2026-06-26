import type { Core } from '@strapi/strapi'

type ResumeWithUser = { user: { id: number } | null | undefined }

export function checkIsResumeOwner(resume: ResumeWithUser, userId: number): boolean {
  return resume.user?.id === userId
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const { id } = ctx.params as { id: string }

  const resume = await (strapi.documents as any)('api::resume.resume').findOne({
    documentId: id,
    populate: { user: { fields: ['id'] } },
  })

  if (!resume) return false

  return checkIsResumeOwner(resume as unknown as ResumeWithUser, user.id)
}
