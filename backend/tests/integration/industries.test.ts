import request from 'supertest'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await teardownStrapi()
})

describe('GET /api/industries', () => {
  it('returns {data: [...]} envelope like all other endpoints', async () => {
    const res = await request(strapi.server.httpServer).get('/api/industries')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0]).toHaveProperty('slug')
    expect(res.body.data[0]).toHaveProperty('specializations')
  })
})
