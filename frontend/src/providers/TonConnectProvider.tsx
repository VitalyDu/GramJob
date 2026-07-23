'use client'

import { TonConnectUIProvider } from '@tonconnect/ui-react'
import type { ReactNode } from 'react'

const MANIFEST_URL =
  process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL ??
  (typeof window !== 'undefined' ? `${window.location.origin}/tonconnect-manifest.json` : '')

export function TonConnectProvider({ children }: { children: ReactNode }) {
  if (!MANIFEST_URL) return <>{children}</>
  return <TonConnectUIProvider manifestUrl={MANIFEST_URL}>{children}</TonConnectUIProvider>
}
