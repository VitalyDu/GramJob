import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Briefcase } from 'lucide-react'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { CardListSkeleton } from './CardListSkeleton'
import { PaginationBar } from './PaginationBar'

describe('PageHeader', () => {
  it('рендерит заголовок h1, описание и actions', () => {
    render(
      <PageHeader
        title="Вакансии"
        description="Найдите работу"
        actions={<button>Создать</button>}
      />
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Вакансии' })).toBeInTheDocument()
    expect(screen.getByText('Найдите работу')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('рендерит заголовок, описание и action', () => {
    render(
      <EmptyState
        icon={Briefcase}
        title="Пока пусто"
        description="Здесь появятся вакансии"
        action={<button>Создать вакансию</button>}
      />
    )
    expect(screen.getByText('Пока пусто')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать вакансию' })).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('вызывает onRetry по кнопке «Повторить»', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Не удалось загрузить" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /повторить/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('CardListSkeleton', () => {
  it('рендерит указанное число скелетонов', () => {
    render(<CardListSkeleton count={4} />)
    expect(screen.getAllByTestId('card-skeleton')).toHaveLength(4)
  })
})

describe('PaginationBar', () => {
  it('вызывает onPageChange при клике на страницу', async () => {
    const onPageChange = vi.fn()
    render(<PaginationBar page={1} pageCount={3} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('не рендерится при pageCount <= 1', () => {
    const { container } = render(<PaginationBar page={1} pageCount={1} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
