// Общие ограничения на пользовательский ввод. Значения выбраны с запасом,
// но не позволяют DDoS-подобной перегрузки БД или падения на VARCHAR(255).

/** Максимум для короткого строкового поля (title, name, firstName, lastName и т.п.). */
export const SHORT_TEXT_MAX_LENGTH = 200

/** Максимум для длинного richtext (description, responsibilities, about и т.п.). */
export const LONG_TEXT_MAX_LENGTH = 20_000

/** Разрешённые схемы для URL-полей (website, linkedin, sourceUrl). */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:'])

/** Валидатор длины короткой строки. Возвращает сообщение ошибки или null, если ок. */
export function validateShortText(field: string, value: unknown): string | null {
  if (typeof value !== 'string') return `${field} must be a string`
  if (value.length === 0) return `${field} must be a non-empty string`
  if (value.length > SHORT_TEXT_MAX_LENGTH) {
    return `${field} must be at most ${SHORT_TEXT_MAX_LENGTH} characters`
  }
  return null
}

/** Валидатор длины длинного richtext. */
export function validateLongText(field: string, value: unknown): string | null {
  if (typeof value !== 'string') return `${field} must be a string`
  if (value.length > LONG_TEXT_MAX_LENGTH) {
    return `${field} must be at most ${LONG_TEXT_MAX_LENGTH} characters`
  }
  return null
}

/** Валидатор http(s) URL. Пустая строка/null пропускаются как «поле не задано». */
export function validateHttpUrl(field: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return `${field} must be a string`
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return `${field} must be a valid URL`
  }
  if (!ALLOWED_URL_SCHEMES.has(parsed.protocol)) {
    return `${field} must use http or https scheme`
  }
  return null
}

/** Проверка зарплатной вилки: неотрицательная, from <= to. */
export function validateSalaryRange(salaryFrom: unknown, salaryTo: unknown): string | null {
  const from = salaryFrom
  const to = salaryTo

  if (from !== undefined && from !== null) {
    if (typeof from !== 'number' || !Number.isFinite(from)) {
      return 'salaryFrom must be a number'
    }
    if (from < 0) return 'salaryFrom must be non-negative'
  }
  if (to !== undefined && to !== null) {
    if (typeof to !== 'number' || !Number.isFinite(to)) {
      return 'salaryTo must be a number'
    }
    if (to < 0) return 'salaryTo must be non-negative'
  }
  if (typeof from === 'number' && typeof to === 'number' && from > to) {
    return 'salaryFrom must be less than or equal to salaryTo'
  }
  return null
}
