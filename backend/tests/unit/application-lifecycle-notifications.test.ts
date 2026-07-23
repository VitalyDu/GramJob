const mockSendNotification = jest.fn()

jest.mock('../../src/services/notification.service', () => ({
  sendNotification: mockSendNotification,
}))

import lifecycles from '../../src/api/application/content-types/application/lifecycles'

const mockFindOne = jest.fn()
const mockStrapi = {
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  documents: () => ({ findOne: mockFindOne }),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(globalThis as any).strapi = mockStrapi
})

function getSentTypes(): string[] {
  return mockSendNotification.mock.calls.map((args: any[]) => (args[1] as any).type)
}

describe('application lifecycle — afterUpdate notifications', () => {
  it('отправляет application_approved при переходе в interview', async () => {
    mockFindOne.mockResolvedValue({
      documentId: 'app123',
      status: 'interview',
      vacancy: { documentId: 'vac123', title: 'Dev Job' },
      user: { id: 42 },
    })

    await lifecycles.afterUpdate({
      result: { documentId: 'app123', status: 'interview' },
      params: { data: { status: 'interview' } },
    })

    expect(getSentTypes()).toContain('application_approved')
  })

  it('отправляет interview_invitation при переходе в interview', async () => {
    mockFindOne.mockResolvedValue({
      documentId: 'app123',
      status: 'interview',
      vacancy: { documentId: 'vac123', title: 'Dev Job' },
      user: { id: 42 },
    })

    await lifecycles.afterUpdate({
      result: { documentId: 'app123', status: 'interview' },
      params: { data: { status: 'interview' } },
    })

    expect(getSentTypes()).toContain('interview_invitation')
  })

  it('НЕ отправляет application_approved при переходе в in-review', async () => {
    mockFindOne.mockResolvedValue({
      documentId: 'app123',
      status: 'in-review',
      vacancy: { documentId: 'vac123', title: 'Dev Job' },
      user: { id: 42 },
    })

    await lifecycles.afterUpdate({
      result: { documentId: 'app123', status: 'in-review' },
      params: { data: { status: 'in-review' } },
    })

    expect(getSentTypes()).not.toContain('application_approved')
    expect(getSentTypes()).toContain('application_in_review')
  })

  it('ничего не отправляет если нет data.status', async () => {
    await lifecycles.afterUpdate({
      result: { documentId: 'app123' },
      params: { data: {} },
    })

    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('S3: отправляет application_approved при in-review → offer (без interview)', async () => {
    mockFindOne.mockResolvedValue({
      documentId: 'app456',
      status: 'offer',
      vacancy: { documentId: 'vac456', title: 'Dev Job' },
      user: { id: 99 },
    })

    await lifecycles.afterUpdate({
      result: { documentId: 'app456', status: 'offer' },
      params: { data: { status: 'offer' } },
      state: { previousStatus: 'in-review' },
    })

    expect(getSentTypes()).toContain('application_approved')
    expect(getSentTypes()).toContain('offer_received')
  })

  it('S3: НЕ отправляет дублирующий application_approved при interview → offer', async () => {
    mockFindOne.mockResolvedValue({
      documentId: 'app789',
      status: 'offer',
      vacancy: { documentId: 'vac789', title: 'Dev Job' },
      user: { id: 55 },
    })

    await lifecycles.afterUpdate({
      result: { documentId: 'app789', status: 'offer' },
      params: { data: { status: 'offer' } },
      state: { previousStatus: 'interview' },
    })

    // interview → offer: contacts already revealed, no second approved
    const approvedCount = getSentTypes().filter((t: string) => t === 'application_approved').length
    expect(approvedCount).toBe(0)
  })

  it('L4: отправляет hired_notification при переходе в hired', async () => {
    mockFindOne.mockResolvedValue({
      documentId: 'app101',
      status: 'hired',
      vacancy: { documentId: 'vac101', title: 'Dev Job' },
      user: { id: 77 },
    })

    await lifecycles.afterUpdate({
      result: { documentId: 'app101', status: 'hired' },
      params: { data: { status: 'hired' } },
      state: { previousStatus: 'offer' },
    })

    expect(getSentTypes()).toContain('hired_notification')
  })
})
