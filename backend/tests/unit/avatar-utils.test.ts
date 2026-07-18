import { isAllowedAvatarUrl } from '../../src/services/avatar-utils'

describe('isAllowedAvatarUrl', () => {
  const OLD_S3 = process.env.S3_PUBLIC_URL
  const OLD_PUB = process.env.PUBLIC_UPLOADS_URL
  beforeEach(() => {
    process.env.S3_PUBLIC_URL = 'http://localhost:9000/gramjob'
    delete process.env.PUBLIC_UPLOADS_URL
  })
  afterEach(() => {
    process.env.S3_PUBLIC_URL = OLD_S3
    process.env.PUBLIC_UPLOADS_URL = OLD_PUB
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

  it('разрешает относительные пути под /uploads/', () => {
    expect(isAllowedAvatarUrl('/uploads/avatar_abc.png')).toBe(true)
    expect(isAllowedAvatarUrl('/uploads/nested/dir/photo.jpg')).toBe(true)
  })

  it('отклоняет попытки traversal и подмены пути', () => {
    expect(isAllowedAvatarUrl('/uploads/../etc/passwd')).toBe(false)
    expect(isAllowedAvatarUrl('/uploads/..%2Fsecret')).toBe(false)
    expect(isAllowedAvatarUrl('/uploads/subdir/../../etc')).toBe(false)
    expect(isAllowedAvatarUrl('/uploads/\\..\\etc')).toBe(false)
    expect(isAllowedAvatarUrl('/uploads')).toBe(false)
    expect(isAllowedAvatarUrl('/etc/passwd')).toBe(false)
    expect(isAllowedAvatarUrl('//evil.example.com/x.png')).toBe(false)
  })

  it('разрешает URL с хоста PUBLIC_UPLOADS_URL (свой API)', () => {
    process.env.PUBLIC_UPLOADS_URL = 'https://api.gramjob.com'
    expect(isAllowedAvatarUrl('https://api.gramjob.com/uploads/avatar_abc.png')).toBe(true)
  })

  it('без PUBLIC_UPLOADS_URL не разрешает URL API-хоста', () => {
    expect(isAllowedAvatarUrl('https://api.gramjob.com/uploads/avatar_abc.png')).toBe(false)
  })

  it('игнорирует некорректный PUBLIC_UPLOADS_URL', () => {
    process.env.PUBLIC_UPLOADS_URL = 'not-a-url'
    expect(isAllowedAvatarUrl('https://api.gramjob.com/uploads/avatar_abc.png')).toBe(false)
    expect(isAllowedAvatarUrl('/uploads/avatar_abc.png')).toBe(true)
  })
})
