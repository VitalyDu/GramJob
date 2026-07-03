import '@testing-library/jest-dom'
// Real i18next init (ru) so components using useTranslation render actual strings
import '@/lib/i18n'
import { vi } from 'vitest'

// Default stub for Next.js router — individual tests can override with their own vi.mock()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
