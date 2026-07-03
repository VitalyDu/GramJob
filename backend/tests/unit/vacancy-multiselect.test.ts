function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

describe('toArray helper', () => {
  it('возвращает пустой массив для undefined', () => {
    expect(toArray(undefined)).toEqual([])
  })

  it('оборачивает строку в массив', () => {
    expect(toArray('remote')).toEqual(['remote'])
  })

  it('возвращает массив без изменений', () => {
    expect(toArray(['remote', 'hybrid'])).toEqual(['remote', 'hybrid'])
  })

  it('возвращает пустой массив для пустой строки', () => {
    expect(toArray('')).toEqual([])
  })
})
