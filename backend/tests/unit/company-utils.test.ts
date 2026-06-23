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

  it('blocks transition from rejected', () => {
    expect(canSubmit('rejected')).toBe(false)
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
