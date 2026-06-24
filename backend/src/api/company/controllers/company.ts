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
        fields: ['documentId', 'name', 'slug', 'status', 'createdAt'],
      })

      return ctx.send({ data: updated })
    },

    async findPublished(ctx: any) {
      const {
        search,
        country,
        companySize,
        page = '1',
        pageSize = '20',
      } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10))
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10)))

      const filters: Record<string, unknown> = { status: { $eq: 'published' } }

      if (search) {
        filters.$or = [{ name: { $containsi: search } }, { description: { $containsi: search } }]
      }
      if (country) filters.country = { $eq: country }
      if (companySize) filters.companySize = { $eq: companySize }

      const [companies, total] = await Promise.all([
        strapi.documents('api::company.company').findMany({
          filters,
          fields: [
            'documentId',
            'name',
            'slug',
            'country',
            'city',
            'companySize',
            'status',
            'createdAt',
          ],
          populate: { logo: true },
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        strapi.documents('api::company.company').count({ filters }),
      ])

      return ctx.send({
        data: companies,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },
  }
}
