import {
  parseCommand,
  buildProfileText,
  buildHelpText,
} from '../../src/api/payment/services/bot-commands'

describe('parseCommand', () => {
  it('парсит /start', () => {
    expect(parseCommand('/start')).toEqual({ command: 'start', args: '' })
  })

  it('парсит /start с payload', () => {
    expect(parseCommand('/start vacancy_123')).toEqual({ command: 'start', args: 'vacancy_123' })
  })

  it('парсит /profile', () => {
    expect(parseCommand('/profile')).toEqual({ command: 'profile', args: '' })
  })

  it('не-команда возвращает null', () => {
    expect(parseCommand('hello')).toBeNull()
  })

  it('пустая строка возвращает null', () => {
    expect(parseCommand('')).toBeNull()
  })
})

describe('buildHelpText', () => {
  it('содержит список команд', () => {
    const text = buildHelpText()
    expect(text).toContain('/profile')
    expect(text).toContain('/notifications')
    expect(text).toContain('/subscribe')
  })
})

describe('buildProfileText', () => {
  it('содержит план пользователя', () => {
    const text = buildProfileText({ subscriptionPlan: 'pro', vacancyCredits: 5, applyCredits: 10 })
    expect(text).toContain('pro')
    expect(text).toContain('5')
    expect(text).toContain('10')
  })
})
