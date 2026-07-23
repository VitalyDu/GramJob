/**
 * C2: VIP-подсветка снимается при истечении VIP-подписки.
 * Тестирует, что expireSubscriptions cron вызывает UPDATE vacancies SET highlighted=false
 * для пользователей с isVip=true.
 */

const mockSendNotification = jest.fn()
jest.mock('../../src/services/notification.service', () => ({
  sendNotification: mockSendNotification,
}))

// Import the cron tasks after mocking
import cronTasks from '../../config/cron-tasks'

function makeExpireStrapi(users: Array<{ id: number; subscriptionPlan: string; isVip?: boolean }>) {
  const rawSql = jest.fn().mockResolvedValue({ rowCount: 0 })
  const userQuery = jest.fn().mockReturnValue({
    findMany: jest.fn().mockResolvedValue(users),
    update: jest.fn().mockResolvedValue({}),
  })

  return {
    db: {
      query: jest.fn().mockImplementation((model: string) => {
        if (model === 'plugin::users-permissions.user') return userQuery()
        return { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() }
      }),
      connection: { raw: rawSql },
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    _rawSql: rawSql,
  } as any
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('expireSubscriptions cron — C2: VIP un-highlight', () => {
  it('снимает highlighted=false с вакансий пользователя при истечении VIP', async () => {
    const strapi = makeExpireStrapi([{ id: 7, subscriptionPlan: 'vip', isVip: true }])

    await cronTasks.expireSubscriptions.task({ strapi })

    const rawCalls = strapi._rawSql.mock.calls as Array<[string, unknown[]]>
    const unhighlightCall = rawCalls.find(
      ([sql]) => sql.includes('highlighted') && sql.includes('false')
    )
    expect(unhighlightCall).toBeDefined()
    expect(unhighlightCall![1]).toContain(7)
  })

  it('НЕ снимает highlight для не-VIP пользователей', async () => {
    const strapi = makeExpireStrapi([{ id: 5, subscriptionPlan: 'pro', isVip: false }])

    await cronTasks.expireSubscriptions.task({ strapi })

    const rawCalls = strapi._rawSql.mock.calls as Array<[string, unknown[]]>
    const unhighlightCall = rawCalls.find(
      ([sql]) => sql.includes('highlighted') && sql.includes('false')
    )
    expect(unhighlightCall).toBeUndefined()
  })
})
