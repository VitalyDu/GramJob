export type SupportedLang = 'ru' | 'en'

function mapToSupported(code: string): SupportedLang {
  return code.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function detectLanguage(input: {
  stored: string | null
  telegramLangCode: string | undefined
  navigatorLang: string | undefined
}): SupportedLang {
  const { stored, telegramLangCode, navigatorLang } = input
  if (stored === 'ru' || stored === 'en') return stored
  if (telegramLangCode) return mapToSupported(telegramLangCode)
  if (navigatorLang) return mapToSupported(navigatorLang)
  return 'en'
}
