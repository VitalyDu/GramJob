import { parseAdminChatIds, buildAdminModerationText } from '../../src/services/admin-notify'

describe('parseAdminChatIds', () => {
  it('пустой/отсутствующий env → []', () => {
    expect(parseAdminChatIds(undefined)).toEqual([])
    expect(parseAdminChatIds('')).toEqual([])
  })

  it('парсит список через запятую с пробелами', () => {
    expect(parseAdminChatIds('123, 456 ,789')).toEqual(['123', '456', '789'])
  })

  it('отбрасывает пустые элементы', () => {
    expect(parseAdminChatIds('123,,456,')).toEqual(['123', '456'])
  })
})

describe('buildAdminModerationText', () => {
  it('вакансия на модерации с автором', () => {
    expect(
      buildAdminModerationText({
        entityType: 'vacancy',
        title: 'Frontend Developer',
        authorName: 'Ivan Petrov',
        authorId: 42,
      })
    ).toBe('🛡 Вакансия на модерации: «Frontend Developer» от Ivan Petrov (#42)')
  })

  it('жалоба', () => {
    expect(buildAdminModerationText({ entityType: 'report', title: 'spam' })).toBe(
      '🛡 Новая жалоба: «spam»'
    )
  })

  it('без автора', () => {
    expect(buildAdminModerationText({ entityType: 'company', title: 'Acme' })).toBe(
      '🛡 Компания на модерации: «Acme»'
    )
  })
})
