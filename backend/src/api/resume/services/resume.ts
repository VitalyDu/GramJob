import type { Core } from '@strapi/strapi'

type CreateResumeInput = {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: string
  workFormat: string
  employmentType: string
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
        workFormat: input.workFormat as 'office' | 'remote' | 'hybrid' | 'any',
        employmentType: input.employmentType as
          | 'full-time'
          | 'part-time'
          | 'contract'
          | 'internship'
          | 'freelance',
        experienceYears: input.experienceYears,
        about: input.about,
        skills: input.skills ?? [],
        languages: input.languages ?? [],
        contacts: input.contacts ?? {},
        workExperience: input.workExperience ?? [],
        education: input.education ?? [],
        views: 0,
        invitations: 0,
        status: 'draft',
      },
    })
  },
})
