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

async function getIndustry() {
  const industries = await strapi.documents('api::industry.industry').findMany({
    populate: { specializations: { fields: ['documentId'] } },
    limit: 1,
  })
  const industry = industries[0] as any
  return { industry, spec: industry.specializations[0] }
}

async function createVacancy(userId: number, status: string) {
  const { industry, spec } = await getIndustry()
  return strapi.documents('api::vacancy.vacancy').create({
    data: {
      title: 'Fav vacancy',
      industry: industry.documentId,
      specialization: spec.documentId,
      employmentType: 'full-time',
      workFormat: 'remote',
      seniority: 'middle',
      country: 'RU',
      description: 'd',
      responsibilities: 'r',
      requirements: 'q',
      skills: [],
      languages: [],
      urgent: false,
      highlighted: false,
      topPlacement: false,
      views: 0,
      uniqueViews: 0,
      applicationsCount: 0,
      status,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      postedBy: userId,
    } as any,
  })
}

async function createResume(userId: number, status: string) {
  return strapi.documents('api::resume.resume').create({
    data: {
      title: 'Fav resume',
      firstName: 'А',
      lastName: 'Б',
      country: 'RU',
      workFormat: 'remote',
      employmentType: 'full-time',
      views: 0,
      invitations: 0,
      status,
      user: userId,
    } as any,
  })
}

async function addFavorite(userId: number, type: string, targetId: string) {
  return strapi.documents('api::favorite.favorite').create({
    data: { user: userId, type, targetId } as any,
  })
}

async function fetchFavorites(jwt: string, type: string) {
  const res = await request(strapi.server.httpServer)
    .get(`/api/favorites?type=${type}`)
    .set('Authorization', `Bearer ${jwt}`)
  expect(res.status).toBe(200)
  return res.body.data as Array<{ targetId: string; entity: unknown }>
}

describe('GET /api/favorites — entity status filter', () => {
  it('returns entity=null for archived vacancy (like company does)', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const archived = await createVacancy(user.id as number, 'archived')
    await addFavorite(user.id as number, 'vacancy', archived.documentId)

    const data = await fetchFavorites(jwt, 'vacancy')
    const fav = data.find((f) => f.targetId === archived.documentId)
    expect(fav).toBeDefined()
    expect(fav!.entity).toBeNull()
  })

  it('returns entity for published vacancy', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const published = await createVacancy(user.id as number, 'published')
    await addFavorite(user.id as number, 'vacancy', published.documentId)

    const data = await fetchFavorites(jwt, 'vacancy')
    const fav = data.find((f) => f.targetId === published.documentId)
    expect(fav!.entity).toMatchObject({ documentId: published.documentId, title: 'Fav vacancy' })
  })

  it('returns entity=null for archived resume', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const archived = await createResume(user.id as number, 'archived')
    await addFavorite(user.id as number, 'resume', archived.documentId)

    const data = await fetchFavorites(jwt, 'resume')
    const fav = data.find((f) => f.targetId === archived.documentId)
    expect(fav).toBeDefined()
    expect(fav!.entity).toBeNull()
  })

  it('returns entity for published resume', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const published = await createResume(user.id as number, 'published')
    await addFavorite(user.id as number, 'resume', published.documentId)

    const data = await fetchFavorites(jwt, 'resume')
    const fav = data.find((f) => f.targetId === published.documentId)
    expect(fav!.entity).toMatchObject({ documentId: published.documentId, title: 'Fav resume' })
  })
})
