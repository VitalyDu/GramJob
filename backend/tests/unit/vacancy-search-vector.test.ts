import { updateSearchVector } from '../../src/api/vacancy/content-types/vacancy/lifecycles'

describe('updateSearchVector — shutdown safety', () => {
  const originalStrapi = (globalThis as any).strapi

  afterEach(() => {
    ;(globalThis as any).strapi = originalStrapi
  })

  it('тихо выходит, если globalThis.strapi уже уничтожен (teardown race)', async () => {
    ;(globalThis as any).strapi = undefined

    await expect(updateSearchVector(1)).resolves.toBeUndefined()
  })
})
