const LANGUAGE_CODES: string[] = [
  'ab',
  'af',
  'ak',
  'am',
  'ar',
  'az',
  'be',
  'bg',
  'bn',
  'bs',
  'ca',
  'cs',
  'cy',
  'da',
  'de',
  'el',
  'en',
  'eo',
  'es',
  'et',
  'eu',
  'fa',
  'fi',
  'fr',
  'ga',
  'gl',
  'gu',
  'he',
  'hi',
  'hr',
  'hu',
  'hy',
  'id',
  'is',
  'it',
  'ja',
  'ka',
  'kk',
  'km',
  'kn',
  'ko',
  'ku',
  'ky',
  'lb',
  'lo',
  'lt',
  'lv',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'ne',
  'nl',
  'no',
  'pa',
  'pl',
  'pt',
  'ro',
  'ru',
  'si',
  'sk',
  'sl',
  'sq',
  'sr',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'tk',
  'tr',
  'uk',
  'ur',
  'uz',
  'vi',
  'yo',
  'zh',
  'zu',
]

function buildDisplayNames(locale: string): Intl.DisplayNames {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' })
  } catch {
    return new Intl.DisplayNames(['ru'], { type: 'language' })
  }
}

export function getLanguageName(code: string, locale = 'ru'): string {
  if (!code) return code
  try {
    return buildDisplayNames(locale).of(code) ?? code
  } catch {
    return code
  }
}

export function getLanguagesList(locale = 'ru'): { code: string; name: string }[] {
  const dn = buildDisplayNames(locale)
  return LANGUAGE_CODES.map((code) => ({ code, name: dn.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, locale)
  )
}

export const LANGUAGES_LIST = getLanguagesList('ru')
