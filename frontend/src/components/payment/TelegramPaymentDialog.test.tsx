import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TelegramPaymentDialog } from './TelegramPaymentDialog'

describe('TelegramPaymentDialog', () => {
  it('renders loading state', () => {
    render(<TelegramPaymentDialog open={true} state="loading" onOpenChange={() => {}} />)
    expect(screen.getByText(/Готовим счёт|Preparing invoice/i)).toBeInTheDocument()
  })

  it('renders ready state with the open-in-telegram link', () => {
    render(
      <TelegramPaymentDialog
        open={true}
        state="ready"
        invoiceUrl="https://t.me/$test-invoice-hash"
        onOpenChange={() => {}}
      />
    )
    const link = screen.getByRole('link', { name: /Открыть в Telegram|Open in Telegram/i })
    expect(link).toHaveAttribute('href', 'https://t.me/$test-invoice-hash')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders QR code SVG when in ready state', async () => {
    render(
      <TelegramPaymentDialog
        open={true}
        state="ready"
        invoiceUrl="https://t.me/$abc"
        onOpenChange={() => {}}
      />
    )
    await waitFor(() => {
      expect(document.querySelector('svg[data-testid="tg-payment-qr"]')).toBeInTheDocument()
    })
  })

  it('renders error state with retry button', async () => {
    const onRetry = vi.fn()
    render(
      <TelegramPaymentDialog
        open={true}
        state="error"
        errorMessage="Network error"
        onRetry={onRetry}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText('Network error')).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: /Попробовать снова|Try again/i })
    await userEvent.click(retry)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('copies link to clipboard on copy button click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(
      <TelegramPaymentDialog
        open={true}
        state="ready"
        invoiceUrl="https://t.me/$xyz"
        onOpenChange={() => {}}
      />
    )
    const copyBtn = screen.getByRole('button', { name: /Скопировать|Copy/i })
    await userEvent.click(copyBtn)
    expect(writeText).toHaveBeenCalledWith('https://t.me/$xyz')
  })
})
