import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LogoUploader } from './LogoUploader'

vi.mock('@/services/api', () => ({
  uploadFile: vi.fn(),
}))

import { uploadFile } from '@/services/api'
const mockUploadFile = vi.mocked(uploadFile)

describe('LogoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает placeholder и кнопку загрузки когда нет логотипа', () => {
    render(<LogoUploader currentLogoUrl={null} onUploadComplete={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: /загрузить логотип/i })).toBeDefined()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('показывает превью и кнопки замены/удаления когда есть логотип', () => {
    render(
      <LogoUploader
        currentLogoUrl="https://example.com/logo.png"
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toBe('https://example.com/logo.png')
    expect(screen.getByRole('button', { name: /заменить/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /удалить/i })).toBeDefined()
  })

  it('вызывает onUploadComplete после успешной загрузки', async () => {
    const onUploadComplete = vi.fn()
    mockUploadFile.mockResolvedValueOnce({ id: 42, url: 'https://example.com/new.png' })

    render(
      <LogoUploader currentLogoUrl={null} onUploadComplete={onUploadComplete} onRemove={vi.fn()} />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'logo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith({ id: 42, url: 'https://example.com/new.png' })
    })
  })

  it('вызывает onRemove при нажатии кнопки удаления', () => {
    const onRemove = vi.fn()
    render(
      <LogoUploader
        currentLogoUrl="https://example.com/logo.png"
        onUploadComplete={vi.fn()}
        onRemove={onRemove}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /удалить/i }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('показывает ошибку при неуспешной загрузке', async () => {
    mockUploadFile.mockRejectedValueOnce(new Error('Upload failed'))

    render(<LogoUploader currentLogoUrl={null} onUploadComplete={vi.fn()} onRemove={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'logo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeDefined()
    })
  })

  it('дизейблит кнопки пока идёт загрузка', async () => {
    let resolve!: (v: { id: number; url: string }) => void
    mockUploadFile.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      })
    )

    render(<LogoUploader currentLogoUrl={null} onUploadComplete={vi.fn()} onRemove={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'logo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      const btn = screen.getByRole('button')
      expect(btn.hasAttribute('disabled')).toBe(true)
    })

    resolve({ id: 1, url: 'https://example.com/logo.png' })
  })
})
