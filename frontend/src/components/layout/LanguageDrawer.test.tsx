import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const changeLanguage = vi.fn()
vi.mock('@/lib/i18n', () => ({
  default: { changeLanguage: (...args: unknown[]) => changeLanguage(...args) },
}))

import { LanguageDrawer } from './LanguageDrawer'

describe('LanguageDrawer', () => {
  beforeEach(() => {
    changeLanguage.mockClear()
  })

  it('не рендерит пункты языков когда закрыт', () => {
    render(<LanguageDrawer open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Русский')).not.toBeInTheDocument()
    expect(screen.queryByText('English')).not.toBeInTheDocument()
  })

  it('показывает пункты RU и EN когда открыт', () => {
    render(<LanguageDrawer open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Русский')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('вызывает changeLanguage("en") при клике на English', () => {
    render(<LanguageDrawer open={true} onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByText('English'))
    expect(changeLanguage).toHaveBeenCalledWith('en')
  })

  it('вызывает onOpenChange(false) после выбора языка', () => {
    const onOpenChange = vi.fn()
    render(<LanguageDrawer open={true} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByText('English'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
