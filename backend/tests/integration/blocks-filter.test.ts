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

async function getIndustryAndSpec() {
  const industries = await strapi.documents('api::industry.industry').findMany({
    populate: { specializations: { fields: ['documentId'] } },
    limit: 1,
  })
  const industry = (industries as any[])[0]
  return { industryId: industry.documentId, specId: industry.specializations[0].documentId }
}

async function createPublishedVacancy(userId: number, title: string) {
  const { industryId, specId } = await getIndustryAndSpec()
  return strapi.documents('api::vacancy.vacancy').create({
    data: {
      title,
      industry: industryId,
      specialization: specId,
      employmentType: ['full-time'],
      workFormat: ['remote'],
      seniority: ['middle'],
      country: 'RU',
      description: 'Уникальное описание для блок-теста',
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

async function createBlock(blockerId: number, targetType: string, targetId: number) {
  return strapi.documents('api::block.block').create({
    data: { user: blockerId, targetType, targetId } as any,
  })
}

describe('Block filter on public listings', () => {
  it('hides blocked employer vacancies in the standard listing (with Bearer on a public route)', async () => {
    const employer = await createTestUser(strapi)
    const candidate = await createTestUser(strapi)
    const vacancy = await createPublishedVacancy(employer.id as number, `BlockTest ${Date.now()}`)
    await createBlock(candidate.id as number, 'employer', employer.id as number)
    const jwt = issueJwt(strapi, candidate.id as number)

    const anon = await request(strapi.server.httpServer).get('/api/vacancies?pageSize=50')
    expect(anon.status).toBe(200)
    expect(anon.body.data.some((v: any) => v.documentId === vacancy.documentId)).toBe(true)

    const res = await request(strapi.server.httpServer)
      .get('/api/vacancies?pageSize=50')
      .set('Authorization', `Bearer ${jwt}`)
    expect(res.status).toBe(200)
    expect(res.body.data.some((v: any) => v.documentId === vacancy.documentId)).toBe(false)
  })

  it('hides blocked employer vacancies in the FTS search path without 500', async () => {
    const employer = await createTestUser(strapi)
    const candidate = await createTestUser(strapi)
    const marker = `Блокфтс${Date.now()}`
    const vacancy = await createPublishedVacancy(employer.id as number, marker)
    await createBlock(candidate.id as number, 'employer', employer.id as number)
    const jwt = issueJwt(strapi, candidate.id as number)

    const anon = await request(strapi.server.httpServer).get(`/api/vacancies?search=${marker}`)
    expect(anon.status).toBe(200)
    expect(anon.body.data.some((v: any) => v.documentId === vacancy.documentId)).toBe(true)

    const res = await request(strapi.server.httpServer)
      .get(`/api/vacancies?search=${marker}`)
      .set('Authorization', `Bearer ${jwt}`)
    expect(res.status).toBe(200)
    expect(res.body.data.some((v: any) => v.documentId === vacancy.documentId)).toBe(false)
  })

  it('hides blocked owner companies in the public company list', async () => {
    const owner = await createTestUser(strapi)
    const viewer = await createTestUser(strapi)
    const company = await strapi.documents('api::company.company').create({
      data: {
        name: `Block Co ${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slug: `block-co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: 'desc',
        country: 'RU',
        companySize: 'size_1_10',
        moderationStatus: 'published',
        owner: owner.id,
      } as any,
    })
    await createBlock(viewer.id as number, 'employer', owner.id as number)
    const jwt = issueJwt(strapi, viewer.id as number)

    const res = await request(strapi.server.httpServer)
      .get('/api/companies?pageSize=100')
      .set('Authorization', `Bearer ${jwt}`)
    expect(res.status).toBe(200)
    expect(res.body.data.some((c: any) => c.documentId === company.documentId)).toBe(false)
  })

  it('hides blocked candidate resumes in the resume database', async () => {
    const candidate = await createTestUser(strapi)
    const employer = await createTestUser(strapi, { subscriptionPlan: 'max' })
    const resume = await strapi.documents('api::resume.resume').create({
      data: {
        title: 'Blocked Candidate Resume',
        firstName: 'Блок',
        lastName: 'Тестов',
        country: 'RU',
        desiredSalary: 1000,
        currency: 'USD',
        workFormat: ['remote'],
        employmentType: ['full-time'],
        experienceYears: 2,
        skills: ['js'],
        languages: [],
        views: 0,
        invitations: 0,
        moderationStatus: 'published',
        user: candidate.id,
      } as any,
    })
    await createBlock(employer.id as number, 'candidate', candidate.id as number)
    const jwt = issueJwt(strapi, employer.id as number)

    const res = await request(strapi.server.httpServer)
      .get('/api/resumes?pageSize=50')
      .set('Authorization', `Bearer ${jwt}`)
    expect(res.status).toBe(200)
    expect(res.body.data.some((r: any) => r.documentId === resume.documentId)).toBe(false)
  })
})
