import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/favorites',
}))

describe('BottomNav', () => {
  it('показывает четыре пункта: Вакансии, Отклики, Избранное, Кабинет', () => {
    render(<BottomNav isMiniApp={false} />)
    expect(screen.getByText('Вакансии')).toBeInTheDocument()
    expect(screen.getByText('Отклики')).toBeInTheDocument()
    expect(screen.getByText('Избранное')).toBeInTheDocument()
    expect(screen.getByText('Кабинет')).toBeInTheDocument()
  })

  it('подсвечивает активный раздел через aria-current', () => {
    render(<BottomNav isMiniApp={false} />)
    const active = screen.getByRole('link', { name: /избранное/i })
    expect(active).toHaveAttribute('aria-current', 'page')
  })

  it('на вебе скрыт на desktop через md:hidden', () => {
    render(<BottomNav isMiniApp={false} />)
    expect(screen.getByRole('navigation')).toHaveClass('md:hidden')
  })

  it('в Mini App отображается без md:hidden', () => {
    render(<BottomNav isMiniApp />)
    expect(screen.getByRole('navigation')).not.toHaveClass('md:hidden')
  })
})
