export interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive: boolean) => void
    hideProgress: () => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
      photo_url?: string
    }
    start_param?: string
    auth_date: number
    hash: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  openInvoice: (url: string, callback?: (status: string) => void) => void
  isVersionAtLeast?: (version: string) => boolean
  version?: string
  platform?: string
  onEvent: (eventType: string, cb: () => void) => void
  offEvent: (eventType: string, cb: () => void) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export function isTelegramMiniApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData
}

/**
 * True only when we're in a real Mini App AND the host client supports the
 * WebApp.openInvoice method (Bot API 6.1+). On a plain browser the SDK still
 * exposes openInvoice as a stub, but calling it just logs "not supported in
 * version 6.0" and no invoice appears — we must fall back to the web dialog.
 */
export function canOpenInvoiceNative(): boolean {
  if (typeof window === 'undefined') return false
  const webApp = window.Telegram?.WebApp
  if (!webApp?.initData) return false
  if (typeof webApp.openInvoice !== 'function') return false
  if (typeof webApp.isVersionAtLeast === 'function' && !webApp.isVersionAtLeast('6.1')) return false
  return true
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}

export function parseStartParam(param: string | null | undefined): string | null {
  if (!param) return null
  if (param === 'subscription') return '/subscription'
  if (param === 'vacancies' || param === 'resumes') return `/${param}`
  const match = /^(vacancy|application|resume|company)_([A-Za-z0-9]+)$/.exec(param)
  const kind = match?.[1]
  const id = match?.[2]
  if (!kind || !id) return null
  switch (kind) {
    case 'vacancy':
      return `/vacancies/${id}`
    case 'application':
      return `/dashboard/applications/${id}`
    case 'resume':
      return `/resumes/${id}`
    case 'company':
      return `/companies/${id}`
    default:
      return null
  }
}

export function hapticImpact(
  style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'
): void {
  getTelegramWebApp()?.HapticFeedback.impactOccurred(style)
}

export function hapticNotify(type: 'error' | 'success' | 'warning'): void {
  getTelegramWebApp()?.HapticFeedback.notificationOccurred(type)
}

export function hapticSelection(): void {
  getTelegramWebApp()?.HapticFeedback.selectionChanged()
}
