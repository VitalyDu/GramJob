import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHomeStats, getLatestVacancies } from './home-data'

const okJson = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response

describe('home-data', () => {
  afterEach(() => vi.restoreAllMocks())

  it('getHomeStats собирает total вакансий, компаний и отраслей', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(okJson({ data: [], meta: { total: 120 } }))
        .mockResolvedValueOnce(okJson({ data: [], meta: { total: 45 } }))
        .mockResolvedValueOnce(okJson({ data: Array.from({ length: 12 }) }))
    )
    const stats = await getHomeStats()
    expect(stats).toEqual({ vacancies: 120, companies: 45, industries: 12 })
  })

  it('getHomeStats возвращает нули при ошибке сети', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    const stats = await getHomeStats()
    expect(stats).toEqual({ vacancies: 0, companies: 0, industries: 0 })
  })

  it('getLatestVacancies возвращает data и пустой массив при ошибке', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(okJson({ data: [{ documentId: 'v1' }], meta: { total: 1 } }))
    )
    expect(await getLatestVacancies(6)).toEqual([{ documentId: 'v1' }])

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    expect(await getLatestVacancies(6)).toEqual([])
  })
})
