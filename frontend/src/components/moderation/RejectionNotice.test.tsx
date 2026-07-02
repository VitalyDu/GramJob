import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RejectionNotice } from './RejectionNotice'

describe('RejectionNotice', () => {
  it('отображает метку причины отклонения', () => {
    render(<RejectionNotice reason="spam" editHref="/edit" onResubmit={() => {}} />)
    expect(screen.getByText(/Спам или дублирующийся контент/)).toBeDefined()
  })

  it('отображает комментарий модератора, если он есть', () => {
    render(
      <RejectionNotice
        reason="other"
        comment="Уберите ссылки из описания"
        editHref="/edit"
        onResubmit={() => {}}
      />
    )
    expect(screen.getByText(/Уберите ссылки из описания/)).toBeDefined()
  })

  it('не отображает блок комментария, если комментария нет', () => {
    render(<RejectionNotice reason="spam" editHref="/edit" onResubmit={() => {}} />)
    expect(screen.queryByText(/Комментарий модератора/)).toBeNull()
  })

  it('содержит ссылку «Исправить» на editHref', () => {
    render(
      <RejectionNotice
        reason="spam"
        editHref="/dashboard/vacancies/abc/edit"
        onResubmit={() => {}}
      />
    )
    const link = screen.getByRole('link', { name: 'Исправить' })
    expect(link.getAttribute('href')).toBe('/dashboard/vacancies/abc/edit')
  })

  it('вызывает onResubmit по кнопке «Отправить повторно»', () => {
    const onResubmit = vi.fn()
    render(<RejectionNotice reason="spam" editHref="/edit" onResubmit={onResubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Отправить повторно' }))
    expect(onResubmit).toHaveBeenCalledOnce()
  })

  it('блокирует кнопку при resubmitDisabled', () => {
    render(
      <RejectionNotice reason="spam" editHref="/edit" onResubmit={() => {}} resubmitDisabled />
    )
    const btn = screen.getByRole('button', { name: 'Отправить повторно' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
