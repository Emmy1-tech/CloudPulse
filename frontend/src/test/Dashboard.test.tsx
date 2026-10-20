import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dashboard from '../components/Dashboard'

// Mock the API service
vi.mock('../services/api', () => ({
  endpointsApi: {
    list: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'Test', url: 'http://test.com', method: 'GET', expected_status: 200, check_interval: 60, is_active: true, user_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: 'Test', url: 'http://test.com', method: 'GET', expected_status: 200, check_interval: 60, is_active: true, user_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: 'Updated', url: 'http://test.com', method: 'GET', expected_status: 200, check_interval: 60, is_active: true, user_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
    delete: vi.fn(() => Promise.resolve()),
    check: vi.fn(() => Promise.resolve({ id: 1, endpoint_id: 1, status: 'success', status_code: 200, response_time: 100, error_message: null, checked_at: new Date().toISOString() })),
    getResults: vi.fn(() => Promise.resolve([])),
  },
  default: {
    get: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    put: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
  },
}))

describe('Dashboard', () => {
  it('renders loading state initially', async () => {
    render(<Dashboard />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No endpoints configured')).toBeInTheDocument()
    })
  })

  it('renders empty state when no endpoints', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('No endpoints configured')).toBeInTheDocument()
    })
  })

  it('renders "Add Endpoint" button', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('+ Add Endpoint')).toBeInTheDocument()
    })
  })

  it('opens form when Add Endpoint is clicked', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      const addButton = screen.getByText('+ Add Endpoint')
      fireEvent.click(addButton)
      expect(screen.getByText('Add Endpoint')).toBeInTheDocument()
    })
  })
})
