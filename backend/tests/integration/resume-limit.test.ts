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

const RESUME_BODY = {
  title: 'Limit Test Resume',
  firstName: 'Лимит',
  lastName: 'Тестов',
  country: 'RU',
  workFormat: ['remote'],
  employmentType: ['full-time'],
}

function postResume(jwt: string, title: string) {
  return request(strapi.server.httpServer)
    .post('/api/resumes')
    .set('Authorization', `Bearer ${jwt}`)
    .send({ ...RESUME_BODY, title })
}

describe('Resume plan limit on create', () => {
  it('free plan: first resume is created, second returns 403 LIMIT_REACHED', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)

    const first = await postResume(jwt, 'Free Resume 1')
    expect(first.status).toBe(201)

    const second = await postResume(jwt, 'Free Resume 2')
    expect(second.status).toBe(403)
    expect(second.body.error.code).toBe('LIMIT_REACHED')
    expect(second.body.error.details).toEqual({ limit: 1, used: 1 })
  })

  it('archived and rejected resumes do not count towards the limit', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)

    const first = await postResume(jwt, 'Archived Resume')
    expect(first.status).toBe(201)

    await (strapi.documents as any)('api::resume.resume').update({
      documentId: first.body.data.documentId,
      data: { moderationStatus: 'archived' },
    })

    const second = await postResume(jwt, 'After Archive Resume')
    expect(second.status).toBe(201)
  })

  it('pro plan allows multiple resumes', async () => {
    const user = await createTestUser(strapi, { subscriptionPlan: 'pro' })
    const jwt = issueJwt(strapi, user.id as number)

    const first = await postResume(jwt, 'Pro Resume 1')
    expect(first.status).toBe(201)
    const second = await postResume(jwt, 'Pro Resume 2')
    expect(second.status).toBe(201)
  })
})
