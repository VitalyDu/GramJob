import '@testing-library/jest-dom'
import { vi } from 'vitest'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// jsdom lacks Pointer Capture APIs — vaul (Drawer) calls them on user events.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn()
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn()
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false)
  }
}

// vaul reads navigator.userAgent for platform detection; jsdom provides one,
// but some code paths access it via `window.navigator.userAgentData` — guard with a stub.
if (typeof navigator !== 'undefined' && !('userAgentData' in navigator)) {
  Object.defineProperty(navigator, 'userAgentData', {
    value: { platform: 'Unknown', mobile: false, brands: [] },
    configurable: true,
  })
}

// vaul reads element.style.transform via getComputedStyle and does
// transform.match(/^matrix3d\(...\)$/) — jsdom returns undefined, which crashes.
// Return a neutral identity matrix so the regex resolves to null and vaul falls through.
if (typeof window !== 'undefined') {
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = ((elt: Element, pseudoElt?: string | null) => {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt ?? null)
    if (!style.transform) {
      Object.defineProperty(style, 'transform', {
        value: 'none',
        configurable: true,
      })
    }
    return style
  }) as typeof window.getComputedStyle
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

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
