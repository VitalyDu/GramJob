import type { Core } from '@strapi/strapi'

type CreateVacancyInput = {
  title: string
  industryId: string
  specializationId: string
  employmentType: string
  workFormat: string
  seniority: string
  country: string
  city?: string
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: string
  description: string
  responsibilities: string
  requirements: string
  conditions?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  experienceYears?: number
  sourceType?: 'internal' | 'external'
  sourceName?: string
  sourceUrl?: string
  urgent?: boolean
  companyId?: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createVacancy(postedById: number, input: CreateVacancyInput) {
    return strapi.documents('api::vacancy.vacancy').create({
      data: {
        title: input.title,
        industry: input.industryId,
        specialization: input.specializationId,
        employmentType: input.employmentType as
          | 'full-time'
          | 'part-time'
          | 'contract'
          | 'internship'
          | 'freelance',
        workFormat: input.workFormat as 'office' | 'remote' | 'hybrid',
        seniority: input.seniority as
          | 'intern'
          | 'junior'
          | 'middle'
          | 'senior'
          | 'lead'
          | 'principal',
        country: input.country,
        city: input.city,
        salaryFrom: input.salaryFrom,
        salaryTo: input.salaryTo,
        salaryCurrency: input.salaryCurrency as 'USD' | 'EUR' | 'RUB' | 'GBP' | undefined,
        description: input.description,
        responsibilities: input.responsibilities,
        requirements: input.requirements,
        conditions: input.conditions,
        skills: input.skills ?? [],
        languages: input.languages ?? [],
        experienceYears: input.experienceYears,
        sourceType: (input.sourceType ?? 'internal') as 'internal' | 'external',
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        urgent: input.urgent ?? false,
        highlighted: false,
        topPlacement: false,
        views: 0,
        uniqueViews: 0,
        applicationsCount: 0,
        // Спека redesign §8: вакансия сразу уходит на модерацию, минуя draft
        status: 'moderation',
        postedBy: postedById,
        company: input.companyId ?? null,
      },
    })
  },

  /**
   * @param extraFilters - MUST be a static SQL fragment only (e.g. "AND country = ?").
   *   Never interpolate user input here directly — pass user values via extraParams instead.
   */
  async searchByVector(
    searchQuery: string,
    offset: number,
    limit: number,
    extraFilters: string,
    extraParams: unknown[]
  ): Promise<{ documentIds: string[]; total: number }> {
    const tsQuery = `plainto_tsquery('russian', ?)`

    const rows = await strapi.db.connection.raw(
      `SELECT document_id
       FROM vacancies
       WHERE status = 'published'
         AND expires_at > NOW()
         AND search_vector @@ ${tsQuery}
         ${extraFilters}
       ORDER BY ts_rank(search_vector, ${tsQuery}) DESC, top_placement DESC, boosted_at DESC NULLS LAST, created_at DESC
       LIMIT ? OFFSET ?`,
      // Bindings follow placeholder order: WHERE tsquery → extraFilters → ORDER BY tsquery
      [searchQuery, ...extraParams, searchQuery, limit, offset]
    )

    const countRows = await strapi.db.connection.raw(
      `SELECT COUNT(*) AS total
       FROM vacancies
       WHERE status = 'published'
         AND expires_at > NOW()
         AND search_vector @@ ${tsQuery}
         ${extraFilters}`,
      [searchQuery, ...extraParams]
    )

    return {
      documentIds: rows.rows.map((r: { document_id: string }) => r.document_id),
      total: parseInt(countRows.rows[0]?.total ?? '0', 10),
    }
  },
})
