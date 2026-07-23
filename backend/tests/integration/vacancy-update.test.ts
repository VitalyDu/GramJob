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

async function getTwoIndustries() {
  const industries = await strapi.documents('api::industry.industry').findMany({
    populate: { specializations: { fields: ['documentId', 'slug'] } },
    limit: 2,
  })
  const [a, b] = industries as any[]
  return {
    industryA: a,
    specA: a.specializations[0],
    industryB: b,
    specB: b.specializations[0],
  }
}

async function createVacancy(
  userId: number,
  industryId: string,
  specializationId: string,
  extra: Record<string, unknown> = {}
) {
  return strapi.documents('api::vacancy.vacancy').create({
    data: {
      title: 'Test vacancy',
      industry: industryId,
      specialization: specializationId,
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
      ...extra,
    } as any,
  })
}

async function createCompany(ownerId: number, status: string) {
  return strapi.documents('api::company.company').create({
    data: {
      name: `Test Co ${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slug: `test-co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: 'Test company description',
      country: 'RU',
      companySize: 'size_1_10',
      moderationStatus: status,
      owner: ownerId,
    } as any,
  })
}

describe('POST /api/vacancies/:id/publish — ownership', () => {
  it('returns 403 if requester does not own the vacancy', async () => {
    const owner = await createTestUser(strapi)
    const stranger = await createTestUser(strapi)
    const strangerJwt = issueJwt(strapi, stranger.id as number)
    const { industryA, specA } = await getTwoIndustries()
    const vacancy = await createVacancy(
      owner.id as number,
      industryA.documentId,
      specA.documentId,
      {
        moderationStatus: 'rejected',
      }
    )

    const res = await request(strapi.server.httpServer)
      .post(`/api/vacancies/${vacancy.documentId}/publish`)
      .set('Authorization', `Bearer ${strangerJwt}`)

    expect(res.status).toBe(403)
  })
})

describe('PUT /api/vacancies/:id — industry/specialization/company', () => {
  it('applies new industryId and specializationId', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const { industryA, specA, industryB, specB } = await getTwoIndustries()
    const vacancy = await createVacancy(user.id as number, industryA.documentId, specA.documentId)

    const res = await request(strapi.server.httpServer)
      .put(`/api/vacancies/${vacancy.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        title: 'Updated title',
        industryId: industryB.documentId,
        specializationId: specB.documentId,
      })

    expect(res.status).toBe(200)
    expect(res.body.data.industry?.documentId).toBe(industryB.documentId)
    expect(res.body.data.specialization?.documentId).toBe(specB.documentId)
  })

  it('applies new companyId when user owns the published company', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const { industryA, specA } = await getTwoIndustries()
    const vacancy = await createVacancy(user.id as number, industryA.documentId, specA.documentId)
    const company = await createCompany(user.id as number, 'published')

    const res = await request(strapi.server.httpServer)
      .put(`/api/vacancies/${vacancy.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ companyId: company.documentId })

    expect(res.status).toBe(200)
    expect(res.body.data.company?.documentId).toBe(company.documentId)
  })

  it('returns 403 when companyId belongs to another user', async () => {
    const user = await createTestUser(strapi)
    const other = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const { industryA, specA } = await getTwoIndustries()
    const vacancy = await createVacancy(user.id as number, industryA.documentId, specA.documentId)
    const foreignCompany = await createCompany(other.id as number, 'published')

    const res = await request(strapi.server.httpServer)
      .put(`/api/vacancies/${vacancy.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ companyId: foreignCompany.documentId })

    expect(res.status).toBe(403)
  })

  it('returns 400 when own company is not published', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const { industryA, specA } = await getTwoIndustries()
    const vacancy = await createVacancy(user.id as number, industryA.documentId, specA.documentId)
    const draftCompany = await createCompany(user.id as number, 'draft')

    const res = await request(strapi.server.httpServer)
      .put(`/api/vacancies/${vacancy.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ companyId: draftCompany.documentId })

    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body)).toContain('published')
  })

  it('returns 400 when industryId does not exist', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const { industryA, specA } = await getTwoIndustries()
    const vacancy = await createVacancy(user.id as number, industryA.documentId, specA.documentId)

    const res = await request(strapi.server.httpServer)
      .put(`/api/vacancies/${vacancy.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ industryId: 'nonexistent-doc-id' })

    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body).toLowerCase()).toContain('industry')
  })
})
