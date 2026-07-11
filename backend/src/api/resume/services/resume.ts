import type { Core } from '@strapi/strapi'

type CreateResumeInput = {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: string
  workFormat: string[]
  employmentType: string[]
  experienceYears?: number
  about?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  contacts?: {
    phone?: string
    email?: string
    telegram?: string
    linkedin?: string
  }
  workExperience?: Array<{
    company: string
    position: string
    startDate: string
    endDate?: string
    current?: boolean
    description?: string
  }>
  education?: Array<{
    institution: string
    degree: string
    field: string
    startDate: string
    endDate?: string
    current?: boolean
  }>
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getIdsByJsonArrayFilters(filters: Record<string, string[]>): Promise<string[]> {
    const entries = Object.entries(filters).filter(([, v]) => v.length > 0)
    if (entries.length === 0) return []
    const conditions: string[] = []
    const params: unknown[] = []
    for (const [field, values] of entries) {
      const col = field.replace(/([A-Z])/g, '_$1').toLowerCase()
      const jsonValues = values.map((v) => JSON.stringify([v]))
      const placeholders = jsonValues.map(() => '?::jsonb').join(', ')
      conditions.push(`(${col}::jsonb @> ANY(ARRAY[${placeholders}]))`)
      params.push(...jsonValues)
    }
    const sql = `SELECT document_id FROM resumes WHERE ${conditions.join(' AND ')} LIMIT 10000`
    const result = await (strapi.db.connection as any).raw(sql, params)
    return (result.rows as { document_id: string }[]).map((r) => r.document_id)
  },

  async createResume(userId: number, input: CreateResumeInput) {
    return (strapi.documents as any)('api::resume.resume').create({
      data: {
        user: userId,
        title: input.title,
        firstName: input.firstName,
        lastName: input.lastName,
        country: input.country,
        city: input.city,
        desiredSalary: input.desiredSalary,
        currency: input.currency as 'USD' | 'EUR' | 'RUB' | 'GBP' | undefined,
        workFormat: input.workFormat as any,
        employmentType: input.employmentType as any,
        experienceYears: input.experienceYears,
        about: input.about,
        skills: input.skills ?? [],
        languages: input.languages ?? [],
        contacts: input.contacts ?? {},
        workExperience: input.workExperience ?? [],
        education: input.education ?? [],
        views: 0,
        invitations: 0,
        moderationStatus: 'draft',
      },
    })
  },
})
