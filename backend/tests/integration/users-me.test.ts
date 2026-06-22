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

describe('GET /api/users/me', () => {
  it('returns current user with all custom fields', async () => {
    const user = await createTestUser(strapi, {
      subscriptionPlan: 'pro',
      vacancyCredits: 5,
      applyCredits: 100,
      language: 'en',
      firstName: 'Иван',
    })
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: user.id,
      subscriptionPlan: 'pro',
      vacancyCredits: 5,
      applyCredits: 100,
      language: 'en',
      firstName: 'Иван',
    })
    expect(res.body).not.toHaveProperty('password')
    expect(res.body).not.toHaveProperty('resetPasswordToken')
  })

  it('returns 401 or 403 without JWT token', async () => {
    const res = await request(strapi.server.httpServer).get('/api/users/me')
    expect([401, 403]).toContain(res.status)
  })
})

describe('PUT /api/users/me', () => {
  it('updates allowed fields: firstName, lastName, language', async () => {
    const user = await createTestUser(strapi, { firstName: 'Old', language: 'ru' })
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ firstName: 'Новое', lastName: 'Имя', language: 'en' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      firstName: 'Новое',
      lastName: 'Имя',
      language: 'en',
    })
  })

  it('silently ignores subscriptionPlan changes', async () => {
    const user = await createTestUser(strapi, { subscriptionPlan: 'free' })
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ subscriptionPlan: 'max' })

    expect(res.status).toBe(200)
    expect(res.body.subscriptionPlan).toBe('free')
  })

  it('silently ignores vacancyCredits changes', async () => {
    const user = await createTestUser(strapi, { vacancyCredits: 0 })
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ vacancyCredits: 9999 })

    expect(res.status).toBe(200)
    expect(res.body.vacancyCredits).toBe(0)
  })

  it('returns 401 or 403 without JWT token', async () => {
    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .send({ firstName: 'X' })
    expect([401, 403]).toContain(res.status)
  })
})
