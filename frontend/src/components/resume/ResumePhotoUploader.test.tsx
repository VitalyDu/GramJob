import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResumePhotoUploader } from './ResumePhotoUploader'

vi.mock('@/services/api', () => ({
  uploadFile: vi.fn(),
}))

import { uploadFile } from '@/services/api'
const mockUploadFile = vi.mocked(uploadFile)

describe('ResumePhotoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает placeholder и кнопку загрузки когда нет фото', () => {
    render(
      <ResumePhotoUploader currentPhotoUrl={null} onUploadComplete={vi.fn()} onRemove={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /загрузить фото/i })).toBeDefined()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('показывает превью и кнопки замены/удаления когда есть фото', () => {
    render(
      <ResumePhotoUploader
        currentPhotoUrl="https://example.com/photo.png"
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toBe('https://example.com/photo.png')
    expect(screen.getByRole('button', { name: /заменить/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /удалить/i })).toBeDefined()
  })

  it('вызывает onUploadComplete после успешной загрузки', async () => {
    const onUploadComplete = vi.fn()
    mockUploadFile.mockResolvedValueOnce({ id: 42, url: 'https://example.com/new.png' })

    render(
      <ResumePhotoUploader
        currentPhotoUrl={null}
        onUploadComplete={onUploadComplete}
        onRemove={vi.fn()}
      />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith({ id: 42, url: 'https://example.com/new.png' })
    })
  })

  it('вызывает onRemove при нажатии кнопки удаления', () => {
    const onRemove = vi.fn()
    render(
      <ResumePhotoUploader
        currentPhotoUrl="https://example.com/photo.png"
        onUploadComplete={vi.fn()}
        onRemove={onRemove}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /удалить/i }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('показывает ошибку при неуспешной загрузке', async () => {
    mockUploadFile.mockRejectedValueOnce(new Error('Upload failed'))

    render(
      <ResumePhotoUploader currentPhotoUrl={null} onUploadComplete={vi.fn()} onRemove={vi.fn()} />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeDefined()
    })
  })

  it('дизейблит кнопки когда disabled=true', () => {
    render(
      <ResumePhotoUploader
        currentPhotoUrl={null}
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
        disabled
      />
    )
    const btn = screen.getByRole('button', { name: /загрузить фото/i })
    expect(btn.hasAttribute('disabled')).toBe(true)
  })
})
