import {
  validateShortText,
  validateLongText,
  validateHttpUrl,
  validateSalaryRange,
  SHORT_TEXT_MAX_LENGTH,
  LONG_TEXT_MAX_LENGTH,
} from '../../src/utils/input-validation'

describe('validateShortText', () => {
  it('accepts a normal title', () => {
    expect(validateShortText('title', 'Senior React Developer')).toBeNull()
  })

  it('rejects non-string', () => {
    expect(validateShortText('title', 123)).toBe('title must be a string')
  })

  it('rejects empty string', () => {
    expect(validateShortText('title', '')).toBe('title must be a non-empty string')
  })

  it('rejects overly long string', () => {
    const huge = 'X'.repeat(SHORT_TEXT_MAX_LENGTH + 1)
    expect(validateShortText('title', huge)).toContain('at most')
  })

  it('accepts string at max length', () => {
    const max = 'X'.repeat(SHORT_TEXT_MAX_LENGTH)
    expect(validateShortText('title', max)).toBeNull()
  })
})

describe('validateLongText', () => {
  it('accepts short description', () => {
    expect(validateLongText('description', 'Hi')).toBeNull()
  })

  it('accepts empty (long fields may be optional)', () => {
    expect(validateLongText('description', '')).toBeNull()
  })

  it('rejects overly long richtext', () => {
    const huge = 'X'.repeat(LONG_TEXT_MAX_LENGTH + 1)
    expect(validateLongText('description', huge)).toContain('at most')
  })
})

describe('validateHttpUrl', () => {
  it('accepts https URL', () => {
    expect(validateHttpUrl('website', 'https://example.com')).toBeNull()
  })

  it('accepts http URL', () => {
    expect(validateHttpUrl('website', 'http://example.com/path')).toBeNull()
  })

  it('passes undefined as unset', () => {
    expect(validateHttpUrl('website', undefined)).toBeNull()
  })

  it('passes empty string as unset', () => {
    expect(validateHttpUrl('website', '')).toBeNull()
  })

  it('rejects javascript: scheme', () => {
    expect(validateHttpUrl('website', 'javascript:alert(1)')).toContain('http or https')
  })

  it('rejects data: scheme', () => {
    expect(validateHttpUrl('website', 'data:text/html,<script>')).toContain('http or https')
  })

  it('rejects file: scheme', () => {
    expect(validateHttpUrl('website', 'file:///etc/passwd')).toContain('http or https')
  })

  it('rejects malformed URL', () => {
    expect(validateHttpUrl('website', 'not a url')).toContain('valid URL')
  })

  it('rejects non-string type', () => {
    expect(validateHttpUrl('website', 42)).toBe('website must be a string')
  })
})

describe('validateSalaryRange', () => {
  it('accepts undefined values', () => {
    expect(validateSalaryRange(undefined, undefined)).toBeNull()
  })

  it('accepts positive from only', () => {
    expect(validateSalaryRange(1000, undefined)).toBeNull()
  })

  it('accepts positive to only', () => {
    expect(validateSalaryRange(undefined, 5000)).toBeNull()
  })

  it('accepts equal from and to', () => {
    expect(validateSalaryRange(1000, 1000)).toBeNull()
  })

  it('rejects negative from', () => {
    expect(validateSalaryRange(-100, 500)).toContain('non-negative')
  })

  it('rejects negative to', () => {
    expect(validateSalaryRange(0, -1)).toContain('non-negative')
  })

  it('rejects from > to', () => {
    expect(validateSalaryRange(5000, 1000)).toContain('less than or equal')
  })

  it('rejects NaN', () => {
    expect(validateSalaryRange(Number.NaN, 100)).toContain('must be a number')
  })

  it('rejects string type', () => {
    expect(validateSalaryRange('1000' as unknown as number, 100)).toContain('must be a number')
  })
})
