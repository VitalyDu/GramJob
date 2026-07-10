import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { detectLanguage } from '@/lib/detect-language'

import ruCommon from '@/locales/ru/common.json'
import enCommon from '@/locales/en/common.json'

type TelegramGlobal = {
  Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } }
}

function resolveInitialLang(): string {
  // SSR: язык уточнится на клиенте при гидрации
  if (typeof window === 'undefined') return 'ru'
  const lang = detectLanguage({
    stored: localStorage.getItem('gramjob_lang'),
    telegramLangCode: (window as unknown as TelegramGlobal).Telegram?.WebApp?.initDataUnsafe?.user
      ?.language_code,
    navigatorLang: navigator.language,
  })
  localStorage.setItem('gramjob_lang', lang)
  return lang
}

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: resolveInitialLang(),
    fallbackLng: 'en',
    resources: {
      ru: { common: ruCommon },
      en: { common: enCommon },
    },
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })
}

export default i18next
