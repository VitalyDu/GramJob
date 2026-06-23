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
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export function isTelegramMiniApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}
