import { toSlug, canSubmit, canDelete } from '../../src/api/company/services/company-utils'

describe('toSlug', () => {
  it('converts name to lowercase hyphenated slug', () => {
    expect(toSlug('Acme Corp')).toBe('acme-corp')
  })

  it('removes non-alphanumeric characters', () => {
    expect(toSlug('Hello & World!')).toBe('hello-world')
  })

  it('collapses multiple spaces into single hyphen', () => {
    expect(toSlug('Hello   World')).toBe('hello-world')
  })

  it('trims leading/trailing whitespace', () => {
    expect(toSlug('  MyCompany  ')).toBe('mycompany')
  })

  it('collapses consecutive hyphens', () => {
    expect(toSlug('A--B')).toBe('a-b')
  })

  it('strips leading hyphens', () => {
    expect(toSlug('-Acme')).toBe('acme')
  })

  it('strips trailing hyphens', () => {
    expect(toSlug('Acme-')).toBe('acme')
  })

  it('returns empty string for special-char-only input', () => {
    expect(toSlug('---')).toBe('')
  })

  it('transliterates Russian cyrillic', () => {
    expect(toSlug('Рога и Копыта')).toBe('roga-i-kopyta')
  })

  it('transliterates multi-letter cyrillic mappings', () => {
    expect(toSlug('Жёлтый Щит')).toBe('zheltyy-shchit')
  })

  it('drops hard and soft signs', () => {
    expect(toSlug('Объём')).toBe('obem')
  })

  it('transliterates Ukrainian letters', () => {
    expect(toSlug('Київ Їжак Ґанок')).toBe('kiyiv-yizhak-ganok')
  })

  it('handles mixed cyrillic and latin', () => {
    expect(toSlug('IT Компания 2024')).toBe('it-kompaniya-2024')
  })
})

describe('canSubmit', () => {
  it('allows transition from draft', () => {
    expect(canSubmit('draft')).toBe(true)
  })

  it('blocks transition from moderation', () => {
    expect(canSubmit('moderation')).toBe(false)
  })

  it('blocks transition from published', () => {
    expect(canSubmit('published')).toBe(false)
  })

  it('allows transition from rejected (re-submit after fixes)', () => {
    expect(canSubmit('rejected')).toBe(true)
  })
})

describe('canDelete', () => {
  it('allows delete when no active vacancies', () => {
    expect(canDelete(0)).toBe(true)
  })

  it('blocks delete when active vacancies exist', () => {
    expect(canDelete(1)).toBe(false)
    expect(canDelete(10)).toBe(false)
  })
})
