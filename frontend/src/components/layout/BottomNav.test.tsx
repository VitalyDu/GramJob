import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/applications',
}))

describe('BottomNav', () => {
  it('показывает пять пунктов: Компании, Вакансии, Мои резюме, Отклики, Кабинет', () => {
    render(<BottomNav isMiniApp={false} />)
    expect(screen.getByText('Компании')).toBeInTheDocument()
    expect(screen.getByText('Вакансии')).toBeInTheDocument()
    expect(screen.getByText('Мои резюме')).toBeInTheDocument()
    expect(screen.getByText('Отклики')).toBeInTheDocument()
    expect(screen.getByText('Кабинет')).toBeInTheDocument()
  })

  it('подсвечивает активный раздел через aria-current', () => {
    render(<BottomNav isMiniApp={false} />)
    const active = screen.getByRole('link', { name: /отклики/i })
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

  it('в Mini App показывает пять пунктов: GramJob, Компании, Вакансии, Мои резюме, Отклики', () => {
    render(<BottomNav isMiniApp={true} />)
    expect(screen.getByText('GramJob')).toBeInTheDocument()
    expect(screen.getByText('Компании')).toBeInTheDocument()
    expect(screen.getByText('Вакансии')).toBeInTheDocument()
    expect(screen.getByText('Мои резюме')).toBeInTheDocument()
    expect(screen.getByText('Отклики')).toBeInTheDocument()
  })

  it('в Mini App не показывает пункт Кабинет', () => {
    render(<BottomNav isMiniApp={true} />)
    expect(screen.queryByText('Кабинет')).not.toBeInTheDocument()
  })

  it('на вебе не показывает пункт GramJob', () => {
    render(<BottomNav isMiniApp={false} />)
    expect(screen.queryByText('GramJob')).not.toBeInTheDocument()
  })
})
