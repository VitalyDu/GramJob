import type { Metadata } from 'next'
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
  title: 'GramJob — Биржа вакансий в Telegram',
  description: 'Международная биржа вакансий и резюме в экосистеме Telegram',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        <I18nProvider>
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
