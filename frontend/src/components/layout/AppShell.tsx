'use client'

import { type ReactNode } from 'react'
import { useTelegramInit } from '@/hooks/useTelegramInit'
import { WebHeader } from './WebHeader'
import { MiniAppBottomNav } from './MiniAppBottomNav'

export function AppShell({ children }: { children: ReactNode }) {
  const { isMiniApp } = useTelegramInit()

  return (
    <div className="flex min-h-screen flex-col">
      {!isMiniApp && <WebHeader />}
      <main className={`flex-1 ${isMiniApp ? 'pb-16' : ''}`}>
        <div className="container mx-auto px-4 py-6">{children}</div>
      </main>
      {isMiniApp && <MiniAppBottomNav />}
    </div>
  )
}
