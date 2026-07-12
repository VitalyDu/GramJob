import request from 'supertest'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import { createTestUser, issueJwt } from '../helpers/factories'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await teardownStrapi()
})

async function createResume(userId: number, status: string) {
  return strapi.documents('api::resume.resume').create({
    data: {
      title: 'Backend Developer',
      firstName: 'Анна',
      lastName: 'Смирнова',
      country: 'RU',
      city: 'Москва',
      desiredSalary: 4000,
      currency: 'USD',
      workFormat: ['remote'],
      employmentType: ['full-time'],
      experienceYears: 4,
      skills: ['node', 'postgres'],
      languages: [{ lang: 'en', level: 'C1' }],
      contacts: { email: 'anna@example.com', telegram: '@anna' },
      views: 0,
      invitations: 0,
      moderationStatus: status,
      user: userId,
    } as any,
  })
}

async function getIndustryAndSpec() {
  const industries = await strapi.documents('api::industry.industry').findMany({
    populate: { specializations: { fields: ['documentId'] } },
    limit: 1,
  })
  const industry = (industries as any[])[0]
  return { industryId: industry.documentId, specId: industry.specializations[0].documentId }
}

async function createVacancy(userId: number) {
  const { industryId, specId } = await getIndustryAndSpec()
  return strapi.documents('api::vacancy.vacancy').create({
    data: {
      title: 'Test vacancy',
      industry: industryId,
      specialization: specId,
      employmentType: ['full-time'],
      workFormat: ['remote'],
      seniority: ['middle'],
      country: 'RU',
      description: 'desc',
      responsibilities: 'resp',
      requirements: 'req',
      skills: [],
      languages: [],
      urgent: false,
      highlighted: false,
      topPlacement: false,
      views: 0,
      uniqueViews: 0,
      applicationsCount: 0,
      moderationStatus: 'published',
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      postedBy: userId,
    } as any,
  })
}

async function createApplication(
  candidateId: number,
  vacancyId: string,
  resumeId: string,
  status: string
) {
  return strapi.documents('api::application.application').create({
    data: {
      user: candidateId,
      vacancy: vacancyId,
      resume: resumeId,
      status,
    } as any,
  })
}

describe('GET /api/resumes/:id — access for non-owners', () => {
  it('Max employer can open a published resume (no application, contacts hidden)', async () => {
    const candidate = await createTestUser(strapi)
    const employer = await createTestUser(strapi, { subscriptionPlan: 'max' })
    const resume = await createResume(candidate.id as number, 'published')
    const jwt = issueJwt(strapi, employer.id as number)

    const res = await request(strapi.server.httpServer)
      .get(`/api/resumes/${resume.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data.firstName).toBe('Анна')
    expect(res.body.data.contacts).toBeNull()
  })

  it('Free employer without incoming application gets 403 SUBSCRIPTION_REQUIRED', async () => {
    const candidate = await createTestUser(strapi)
    const employer = await createTestUser(strapi, { subscriptionPlan: 'free' })
    const resume = await createResume(candidate.id as number, 'published')
    const jwt = issueJwt(strapi, employer.id as number)

    const res = await request(strapi.server.httpServer)
      .get(`/api/resumes/${resume.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('SUBSCRIPTION_REQUIRED')
  })

  it('Free employer with an incoming application can open the resume and sees contacts', async () => {
    const candidate = await createTestUser(strapi)
    const employer = await createTestUser(strapi, { subscriptionPlan: 'free' })
    const resume = await createResume(candidate.id as number, 'published')
    const vacancy = await createVacancy(employer.id as number)
    await createApplication(
      candidate.id as number,
      vacancy.documentId,
      resume.documentId,
      'applied'
    )
    const jwt = issueJwt(strapi, employer.id as number)

    const res = await request(strapi.server.httpServer)
      .get(`/api/resumes/${resume.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data.firstName).toBe('Анна')
    // Бизнес-правило: контакты видны работодателю сразу при получении отклика
    expect(res.body.data.contacts).toEqual({ email: 'anna@example.com', telegram: '@anna' })
  })

  it('employer sees candidate contacts in the vacancy applications list', async () => {
    const candidate = await createTestUser(strapi)
    const employer = await createTestUser(strapi, { subscriptionPlan: 'free' })
    const resume = await createResume(candidate.id as number, 'published')
    const vacancy = await createVacancy(employer.id as number)
    await createApplication(
      candidate.id as number,
      vacancy.documentId,
      resume.documentId,
      'applied'
    )
    const jwt = issueJwt(strapi, employer.id as number)

    const res = await request(strapi.server.httpServer)
      .get(`/api/vacancies/${vacancy.documentId}/applications`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].resume.contacts).toEqual({
      email: 'anna@example.com',
      telegram: '@anna',
    })
  })

  it('employer sees contacts once the application is in review', async () => {
    const candidate = await createTestUser(strapi)
    const employer = await createTestUser(strapi, { subscriptionPlan: 'free' })
    const resume = await createResume(candidate.id as number, 'published')
    const vacancy = await createVacancy(employer.id as number)
    await createApplication(
      candidate.id as number,
      vacancy.documentId,
      resume.documentId,
      'in-review'
    )
    const jwt = issueJwt(strapi, employer.id as number)

    const res = await request(strapi.server.httpServer)
      .get(`/api/resumes/${resume.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data.contacts).toEqual({ email: 'anna@example.com', telegram: '@anna' })
  })

  it('owner sees own resume with contacts in any status', async () => {
    const candidate = await createTestUser(strapi)
    const resume = await createResume(candidate.id as number, 'moderation')
    const jwt = issueJwt(strapi, candidate.id as number)

    const res = await request(strapi.server.httpServer)
      .get(`/api/resumes/${resume.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data.contacts).toEqual({ email: 'anna@example.com', telegram: '@anna' })
  })
})
