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

async function createCompany(ownerId: number, status: string) {
  return strapi.documents('api::company.company').create({
    data: {
      name: `Submit Co ${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slug: `submit-co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: 'Test company description',
      country: 'RU',
      city: 'Москва',
      companySize: 'size_11_50',
      moderationStatus: status,
      owner: ownerId,
    } as any,
  })
}

describe('POST /api/companies/:id/submit', () => {
  it('returns full card fields so the dashboard card stays intact', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const company = await createCompany(user.id as number, 'draft')

    const res = await request(strapi.server.httpServer)
      .post(`/api/companies/${company.documentId}/submit`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data.moderationStatus).toBe('moderation')
    for (const key of ['name', 'slug', 'country', 'city', 'companySize', 'createdAt']) {
      expect(res.body.data).toHaveProperty(key)
    }
    expect(res.body.data.country).toBe('RU')
    expect(res.body.data.companySize).toBe('size_11_50')
  })

  it('owner can edit a published company and it returns to moderation', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const company = await createCompany(user.id as number, 'published')

    const res = await request(strapi.server.httpServer)
      .put(`/api/companies/${company.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ city: 'Казань' })

    expect(res.status).toBe(200)
    expect(res.body.data.city).toBe('Казань')
    expect(res.body.data.moderationStatus).toBe('moderation')
  })

  it('owner can edit a company that is already under moderation (stays in moderation)', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const company = await createCompany(user.id as number, 'moderation')

    const res = await request(strapi.server.httpServer)
      .put(`/api/companies/${company.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ city: 'Казань' })

    expect(res.status).toBe(200)
    expect(res.body.data.city).toBe('Казань')
    expect(res.body.data.moderationStatus).toBe('moderation')
  })

  it('error message for non-submittable status mentions both draft and rejected', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const company = await createCompany(user.id as number, 'published')

    const res = await request(strapi.server.httpServer)
      .post(`/api/companies/${company.documentId}/submit`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(400)
    const message = JSON.stringify(res.body)
    expect(message).toContain('draft')
    expect(message).toContain('rejected')
  })
})
