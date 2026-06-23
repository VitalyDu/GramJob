import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import ruCommon from '@/locales/ru/common.json'
import enCommon from '@/locales/en/common.json'

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
}

export default i18next
