import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/stores/StoreProvider'
import { I18nProvider } from '@/components/I18nProvider'
import { AppShell } from '@/components/layout/AppShell'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'GramJob — работа и вакансии в Telegram',
  description:
    'Международная биржа вакансий и резюме в экосистеме Telegram. Find opportunities. Build futures.',
  icons: { icon: '/logo-vertical.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <I18nProvider>
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
