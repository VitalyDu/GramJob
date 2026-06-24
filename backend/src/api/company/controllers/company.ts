import type { Core } from '@strapi/strapi'
import { toSlug, canSubmit, canDelete } from '../services/company-utils'
import type companyServiceFactory from '../services/company'

type CompanyService = ReturnType<typeof companyServiceFactory>

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::company.company') as unknown as CompanyService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number }
      const body = ctx.request.body as Record<string, unknown>

      const { name, description, country, companySize } = body
      if (!name || !description || !country || !companySize) {
        return ctx.badRequest('name, description, country and companySize are required')
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
      ctx.send({ data: company })
    },
  }
}
