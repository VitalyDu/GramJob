/**
 * Unit tests for ownership checks in resume.publish, resume.archive,
 * and vacancy.publish endpoints.
 *
 * These endpoints previously loaded the entity without populating the owner
 * relation, so any authenticated user could mutate any entity.
 */

import resumeController from '../../src/api/resume/controllers/resume'
import vacancyController from '../../src/api/vacancy/controllers/vacancy'

function makeForbiddenCtx(userId: number) {
  return {
    state: { user: { id: userId } },
    params: { id: 'doc-123' },
    request: { body: {} },
    forbidden: jest.fn((msg?: string) => ({ status: 403, msg })),
    notFound: jest.fn((msg?: string) => ({ status: 404, msg })),
    badRequest: jest.fn((msg?: string) => ({ status: 400, msg })),
    unauthorized: jest.fn((msg?: string) => ({ status: 401, msg })),
    send: jest.fn(),
  }
}

function makeStrapi(defaultResume: Record<string, unknown>) {
  const docMock = {
    findOne: jest.fn().mockResolvedValue(defaultResume),
    update: jest.fn().mockResolvedValue({ ...defaultResume, moderationStatus: 'archived' }),
  }
  return {
    documents: jest.fn().mockReturnValue(docMock),
    _docMock: docMock,
    db: {
      query: jest.fn().mockReturnValue({ findOne: jest.fn(), update: jest.fn() }),
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    service: jest.fn(),
    plugin: jest.fn(),
  } as any
}

function makeVacancyStrapi(defaultVacancy: Record<string, unknown>) {
  const docMock = {
    findOne: jest.fn().mockResolvedValue(defaultVacancy),
    update: jest.fn().mockResolvedValue({ ...defaultVacancy, moderationStatus: 'moderation' }),
    count: jest.fn().mockResolvedValue(0),
  }
  return {
    documents: jest.fn().mockReturnValue(docMock),
    _docMock: docMock,
    db: {
      query: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ subscriptionPlan: 'free' }),
        update: jest.fn(),
      }),
      connection: { raw: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }) },
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    service: jest.fn().mockReturnValue({
      createVacancy: jest.fn(),
      searchByVector: jest.fn(),
      getIdsByJsonArrayFilters: jest.fn(),
    }),
  } as any
}

describe('resume.archive — ownership check', () => {
  it('возвращает 403 если пользователь не является владельцем', async () => {
    const strapi = makeStrapi({
      documentId: 'doc-123',
      moderationStatus: 'published',
      user: { id: 99 },
    })
    const ctx = makeForbiddenCtx(42)

    const handler = resumeController({ strapi }).archive as (ctx: any) => Promise<void>
    await handler(ctx)

    expect(ctx.forbidden).toHaveBeenCalled()
    expect(ctx.send).not.toHaveBeenCalled()
  })

  it('выполняет архивацию для владельца', async () => {
    const strapi = makeStrapi({
      documentId: 'doc-123',
      moderationStatus: 'published',
      user: { id: 42 },
    })
    const ctx = makeForbiddenCtx(42)

    const handler = resumeController({ strapi }).archive as (ctx: any) => Promise<void>
    await handler(ctx)

    expect(ctx.forbidden).not.toHaveBeenCalled()
    expect(ctx.send).toHaveBeenCalled()
  })
})

describe('resume.publish — ownership check', () => {
  it('возвращает 403 если пользователь не является владельцем', async () => {
    const strapi = makeStrapi({
      documentId: 'doc-123',
      moderationStatus: 'draft',
      user: { id: 99 },
    })
    const ctx = makeForbiddenCtx(42)

    const handler = resumeController({ strapi }).publish as (ctx: any) => Promise<void>
    await handler(ctx)

    expect(ctx.forbidden).toHaveBeenCalled()
    expect(ctx.send).not.toHaveBeenCalled()
  })

  it('выполняет публикацию для владельца', async () => {
    const strapi = makeStrapi({
      documentId: 'doc-123',
      moderationStatus: 'draft',
      user: { id: 42 },
    })
    const ctx = makeForbiddenCtx(42)

    const handler = resumeController({ strapi }).publish as (ctx: any) => Promise<void>
    await handler(ctx)

    expect(ctx.forbidden).not.toHaveBeenCalled()
    expect(ctx.send).toHaveBeenCalled()
  })
})

describe('vacancy.publish — ownership check', () => {
  it('возвращает 403 если пользователь не является владельцем', async () => {
    const strapi = makeVacancyStrapi({
      documentId: 'doc-123',
      moderationStatus: 'rejected',
      postedBy: { id: 99 },
    })
    const ctx = makeForbiddenCtx(42)

    const handler = vacancyController({ strapi }).publish as (ctx: any) => Promise<void>
    await handler(ctx)

    expect(ctx.forbidden).toHaveBeenCalled()
    expect(ctx.send).not.toHaveBeenCalled()
  })
})
