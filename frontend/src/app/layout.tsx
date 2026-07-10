import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/stores/StoreProvider'
import { I18nProvider } from '@/components/I18nProvider'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { SITE_URL } from '@/lib/site'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'GramJob — работа и вакансии в Telegram',
  description:
    'Международная биржа вакансий и резюме в экосистеме Telegram. Find opportunities. Build futures.',
  icons: { icon: '/logo-vertical.png' },
  openGraph: {
    siteName: 'GramJob',
    type: 'website',
    locale: 'ru_RU',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="gramjob_theme"
        >
          <I18nProvider>
            <StoreProvider>
              <AppShell>{children}</AppShell>
            </StoreProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
