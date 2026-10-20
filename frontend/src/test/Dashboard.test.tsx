import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dashboard from '../components/Dashboard'
import { endpointsApi } from '../services/api'

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
    getIncidents: vi.fn(() => Promise.resolve([])),
    updateIncident: vi.fn(() => Promise.resolve({ id: 1, endpoint_id: 1, status: 'resolved', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), resolved_at: new Date().toISOString() })),
    getStats: vi.fn(() => Promise.resolve({ total_checks: 0, success_count: 0, failure_count: 0, success_rate: 0, avg_response_time: null, uptime_percentage: 0 })),
  },
  default: {
    get: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    put: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
  },
}))

describe('Dashboard', () => {
  it('renders loading state initially', () => {
    render(<Dashboard />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders empty state when no endpoints', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('No endpoints configured')).toBeInTheDocument()
    })
  })

  it('loads incident data through the configured API client', async () => {
    const endpoint = {
      id: 1,
      user_id: 1,
      name: 'Test API',
      url: 'https://api.example.com',
      method: 'GET',
      headers: null,
      body: null,
      expected_status: 200,
      check_interval: 60,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const incident = {
      id: 7,
      endpoint_id: 1,
      status: 'open' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
    }
    vi.mocked(endpointsApi.list).mockResolvedValue([endpoint])
    vi.mocked(endpointsApi.getIncidents).mockResolvedValue([incident])

    render(<Dashboard />)

    await waitFor(() => {
      expect(endpointsApi.getIncidents).toHaveBeenCalledWith(1)
      expect(screen.getByText('Incident #7')).toBeInTheDocument()
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
