import { isAllowedAvatarUrl } from '../../src/services/avatar-utils'

describe('isAllowedAvatarUrl', () => {
  const OLD_ENV = process.env.S3_PUBLIC_URL
  beforeEach(() => {
    process.env.S3_PUBLIC_URL = 'http://localhost:9000/gramjob'
  })
  afterEach(() => {
    process.env.S3_PUBLIC_URL = OLD_ENV
  })

  it('разрешает null и пустую строку (сброс аватара)', () => {
    expect(isAllowedAvatarUrl(null)).toBe(true)
    expect(isAllowedAvatarUrl('')).toBe(true)
  })

  it('разрешает URL собственного uploads-хоста', () => {
    expect(isAllowedAvatarUrl('http://localhost:9000/gramjob/avatar_abc.png')).toBe(true)
  })

  it('разрешает Telegram photo_url', () => {
    expect(isAllowedAvatarUrl('https://t.me/i/userpic/320/abc.jpg')).toBe(true)
    expect(isAllowedAvatarUrl('https://cdn.telegram-cdn.org/file/abc123.jpg')).toBe(true)
  })

  it('отклоняет чужие домены', () => {
    expect(isAllowedAvatarUrl('https://evil.example.com/x.png')).toBe(false)
  })

  it('отклоняет не-URL и не-строки', () => {
    expect(isAllowedAvatarUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedAvatarUrl(123)).toBe(false)
    expect(isAllowedAvatarUrl('not a url')).toBe(false)
  })
})
