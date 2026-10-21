import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import api from '../services/api'

vi.mock('../components/Dashboard', () => ({
  default: () => <div>Dashboard fixture</div>,
}))

vi.mock('../components/PortfolioHero', () => ({
  default: () => <div>Portfolio fixture</div>,
}))

vi.mock('../services/api', () => ({
  default: { get: vi.fn() },
}))

describe('App backend connection indicator', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('shows a connected state when the health endpoint responds healthy', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { status: 'healthy' } } as never)

    render(<App />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Backend connected'))
  })

  it('shows an unavailable state when the backend cannot be reached', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('connection refused'))

    render(<App />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Backend unavailable'))
  })
})
