import type { Core } from '@strapi/strapi'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toSlug, canSubmit, canDelete } from '../services/company-utils'
import type companyServiceFactory from '../services/company'

type CompanyService = ReturnType<typeof companyServiceFactory>

const VALID_COMPANY_SIZES = [
  'size_1_10',
  'size_11_50',
  'size_51_200',
  'size_201_500',
  'size_500_plus',
] as const

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::company.company') as unknown as CompanyService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const body = ctx.request.body as Record<string, unknown>

      const { name, description, country, companySize } = body
      if (!name || !description || !country || !companySize) {
        return ctx.badRequest('name, description, country and companySize are required')
      }

      if (!VALID_COMPANY_SIZES.includes(companySize as (typeof VALID_COMPANY_SIZES)[number])) {
        return ctx.badRequest(`companySize must be one of: ${VALID_COMPANY_SIZES.join(', ')}`)
      }

      const company = await svc().createCompany(user.id, {
        name: name as string,
        description: description as string,
        country: country as string,
        companySize: companySize as string,
        city: body.city as string | undefined,
        website: body.website as string | undefined,
        telegram: body.telegram as string | undefined,
        linkedin: body.linkedin as string | undefined,
      })

      ctx.status = 201
      return ctx.send({ data: company })
    },

    async submit(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const company = await strapi.documents('api::company.company').findOne({
        documentId: id,
        populate: { owner: { fields: ['id'] } },
      })

      if (!company) return ctx.notFound('Company not found')

      const owner = company.owner as { id: number } | null
      if (!owner || owner.id !== user.id) {
        return ctx.forbidden('You are not the owner of this company')
      }

      const status = company.status as string | null | undefined
      if (!status || !canSubmit(status)) {
        return ctx.badRequest(`Cannot submit company with status "${status}". Must be "draft".`)
      }

      const updated = await strapi.documents('api::company.company').update({
        documentId: id,
        data: { status: 'moderation' },
      })

      return ctx.send({ data: updated })
    },
  }
}
