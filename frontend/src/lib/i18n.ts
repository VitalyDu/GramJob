import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import ruCommon from '@/locales/ru/common.json'
import enCommon from '@/locales/en/common.json'

// Always start with 'ru' so server and client produce the same HTML during hydration.
// The user's preferred language is applied after mount via I18nProvider.
// The `else` branch handles HMR in development where the i18next singleton survives
// module re-evaluation but may still hold a previous non-'ru' language.
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: 'ru',
    fallbackLng: 'en',
    resources: {
      ru: { common: ruCommon },
      en: { common: enCommon },
    },
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })
} else if (i18next.language !== 'ru') {
  void i18next.changeLanguage('ru')
}

export default i18next
