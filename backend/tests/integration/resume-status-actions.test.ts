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
      title: 'Frontend Developer',
      firstName: 'Иван',
      lastName: 'Петров',
      country: 'RU',
      city: 'Москва',
      desiredSalary: 3000,
      currency: 'USD',
      workFormat: 'remote',
      employmentType: 'full-time',
      experienceYears: 5,
      skills: ['react', 'typescript'],
      languages: [{ lang: 'en', level: 'B2' }],
      views: 0,
      invitations: 0,
      status,
      user: userId,
    } as any,
  })
}

const CARD_KEYS = [
  'firstName',
  'lastName',
  'country',
  'city',
  'desiredSalary',
  'currency',
  'workFormat',
  'employmentType',
  'experienceYears',
  'skills',
  'createdAt',
]

describe('POST /api/resumes/:id/publish', () => {
  it('returns full owner card fields so the dashboard card stays intact', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const resume = await createResume(user.id as number, 'draft')

    const res = await request(strapi.server.httpServer)
      .post(`/api/resumes/${resume.documentId}/publish`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('moderation')
    for (const key of CARD_KEYS) {
      expect(res.body.data).toHaveProperty(key)
    }
    expect(res.body.data.firstName).toBe('Иван')
    expect(res.body.data.workFormat).toBe('remote')
  })
})

describe('DELETE /api/resumes/:id (archive)', () => {
  it('returns full owner card fields so the dashboard card stays intact', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)
    const resume = await createResume(user.id as number, 'published')

    const res = await request(strapi.server.httpServer)
      .delete(`/api/resumes/${resume.documentId}`)
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('archived')
    for (const key of CARD_KEYS) {
      expect(res.body.data).toHaveProperty(key)
    }
    expect(res.body.data.lastName).toBe('Петров')
  })
})
