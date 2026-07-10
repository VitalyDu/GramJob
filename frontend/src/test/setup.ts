import '@testing-library/jest-dom'
import { vi } from 'vitest'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Real i18next init so components using useTranslation render actual strings
import i18n from '@/lib/i18n'

// Force Russian after init — jsdom's navigator.language defaults to 'en-US'
// which would cause detectLanguage to pick 'en' in a fresh test environment
void i18n.changeLanguage('ru')

// Default stub for Next.js router — individual tests can override with their own vi.mock()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
