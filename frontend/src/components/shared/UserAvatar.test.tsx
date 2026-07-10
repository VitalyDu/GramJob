import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserAvatar } from './UserAvatar'

describe('UserAvatar', () => {
  it('показывает инициал из firstName без аватара', () => {
    render(<UserAvatar user={{ firstName: 'ivan', email: 'a@b.c', avatar: null }} />)
    expect(screen.getByText('I')).toBeInTheDocument()
  })

  it('fallback на email при отсутствии имени', () => {
    render(<UserAvatar user={{ firstName: null, email: 'x@b.c', avatar: null }} />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })
})
