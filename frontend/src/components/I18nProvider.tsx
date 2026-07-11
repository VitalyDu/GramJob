'use client'

import { useEffect, type ReactNode } from 'react'
import '@/lib/i18n'
import i18next from '@/lib/i18n'
import { detectLanguage } from '@/lib/detect-language'

type TelegramGlobal = {
  Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lang = detectLanguage({
      stored: localStorage.getItem('gramjob_lang'),
      telegramLangCode: (window as unknown as TelegramGlobal).Telegram?.WebApp?.initDataUnsafe?.user
        ?.language_code,
      navigatorLang: navigator.language,
    })
    localStorage.setItem('gramjob_lang', lang)
    void i18next.changeLanguage(lang)
  }, [])

  return <>{children}</>
}
