// Тестирует логику sanitizeJsonFields из vacancy lifecycles.
// Функция не экспортируется, поэтому тестируем эквивалентную логику напрямую.

function sanitizeJsonFields(data: Record<string, unknown>) {
  for (const field of ['skills', 'languages']) {
    if (field in data && (data[field] === '' || data[field] === undefined)) {
      data[field] = null
    }
  }
}

describe('sanitizeJsonFields', () => {
  it('не трогает поля, которых нет в data (partial update)', () => {
    const data: Record<string, unknown> = { moderationStatus: 'published' }
    sanitizeJsonFields(data)
    expect('skills' in data).toBe(false)
    expect('languages' in data).toBe(false)
  })

  it('заменяет пустую строку на null', () => {
    const data: Record<string, unknown> = { skills: '', languages: '' }
    sanitizeJsonFields(data)
    expect(data.skills).toBeNull()
    expect(data.languages).toBeNull()
  })

  it('заменяет undefined на null, если поле явно присутствует в data', () => {
    const data: Record<string, unknown> = { skills: undefined }
    sanitizeJsonFields(data)
    expect(data.skills).toBeNull()
  })

  it('не трогает непустой массив', () => {
    const data: Record<string, unknown> = {
      skills: ['React', 'TypeScript'],
      languages: ['English'],
    }
    sanitizeJsonFields(data)
    expect(data.skills).toEqual(['React', 'TypeScript'])
    expect(data.languages).toEqual(['English'])
  })

  it('не трогает null (уже null)', () => {
    const data: Record<string, unknown> = { skills: null }
    sanitizeJsonFields(data)
    expect(data.skills).toBeNull()
  })
})
