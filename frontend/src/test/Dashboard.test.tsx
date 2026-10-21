import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from '../components/Dashboard'
import { endpointsApi } from '../services/api'
import type { Endpoint, Incident, MonitoringResult } from '../types'

vi.mock('../services/api', () => ({
  endpointsApi: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    check: vi.fn(),
    getResults: vi.fn(),
    getIncidents: vi.fn(),
    updateIncident: vi.fn(),
    getStats: vi.fn(),
  },
}))

const timestamp = '2026-10-20T12:00:00.000Z'

function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
  return {
    id: 1,
    user_id: 1,
    name: 'Public API',
    url: 'https://api.example.com/health',
    method: 'GET',
    headers: null,
    body: null,
    expected_status: 200,
    check_interval: 60,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 7,
    endpoint_id: 1,
    status: 'open',
    created_at: timestamp,
    updated_at: timestamp,
    resolved_at: null,
    ...overrides,
  }
}

function makeResult(overrides: Partial<MonitoringResult> = {}): MonitoringResult {
  return {
    id: 11,
    endpoint_id: 1,
    status: 'failure',
    status_code: 503,
    response_time: 450,
    error_message: 'Illustrative failure',
    checked_at: timestamp,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(endpointsApi.list).mockResolvedValue([])
  vi.mocked(endpointsApi.create).mockResolvedValue(makeEndpoint())
  vi.mocked(endpointsApi.get).mockResolvedValue(makeEndpoint())
  vi.mocked(endpointsApi.update).mockResolvedValue(makeEndpoint())
  vi.mocked(endpointsApi.delete).mockResolvedValue(undefined)
  vi.mocked(endpointsApi.check).mockResolvedValue(makeResult())
  vi.mocked(endpointsApi.getResults).mockResolvedValue([])
  vi.mocked(endpointsApi.getIncidents).mockResolvedValue([])
  vi.mocked(endpointsApi.updateIncident).mockResolvedValue(makeIncident({ status: 'resolved', resolved_at: timestamp }))
  vi.mocked(endpointsApi.getStats).mockResolvedValue({
    total_checks: 0,
    success_count: 0,
    failure_count: 0,
    success_rate: 0,
    avg_response_time: null,
    uptime_percentage: 0,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Dashboard interactions', () => {
  it('shows the loading state and then the empty workspace', async () => {
    let resolveList!: (endpoints: Endpoint[]) => void
    vi.mocked(endpointsApi.list).mockImplementationOnce(
      () => new Promise(resolve => { resolveList = resolve }),
    )

    render(<Dashboard />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await act(async () => resolveList([]))
    expect(await screen.findByText('No endpoints configured')).toBeInTheDocument()
  })

  it('creates an endpoint from the form and reloads the inventory', async () => {
    const created = makeEndpoint({ name: 'New Service', url: 'https://new.example.com' })
    vi.mocked(endpointsApi.list)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([created])

    render(<Dashboard />)
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Endpoint' }))
    fireEvent.change(screen.getByLabelText('Name:'), { target: { value: 'New Service' } })
    fireEvent.change(screen.getByLabelText('URL:'), { target: { value: 'https://new.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(endpointsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Service',
      url: 'https://new.example.com',
    })))
    expect(await screen.findByText('New Service')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Add Endpoint' })).not.toBeInTheDocument()
  })

  it('shows an inline error and keeps the form open when save fails', async () => {
    vi.mocked(endpointsApi.create).mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<Dashboard />)
    fireEvent.click(await screen.findByRole('button', { name: '+ Add Endpoint' }))
    fireEvent.change(screen.getByLabelText('Name:'), { target: { value: 'Unavailable' } })
    fireEvent.change(screen.getByLabelText('URL:'), { target: { value: 'https://unavailable.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the endpoint')
    expect(screen.getByRole('heading', { name: 'Add Endpoint' })).toBeInTheDocument()
  })

  it('edits an endpoint and returns to the refreshed inventory', async () => {
    const original = makeEndpoint()
    const updated = makeEndpoint({ name: 'Updated API' })
    vi.mocked(endpointsApi.list)
      .mockResolvedValueOnce([original])
      .mockResolvedValueOnce([updated])
    vi.mocked(endpointsApi.update).mockResolvedValueOnce(updated)

    render(<Dashboard />)
    fireEvent.click(await screen.findByText('Public API'))
    const detailDialog = await screen.findByRole('dialog', { name: 'Public API' })
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Name:'), { target: { value: 'Updated API' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(endpointsApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated API' })))
    expect(await screen.findByText('Updated API')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('leaves endpoint details open when deletion is cancelled', async () => {
    vi.mocked(endpointsApi.list).mockResolvedValue([makeEndpoint()])
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<Dashboard />)
    fireEvent.click(await screen.findByText('Public API'))
    const detailDialog = await screen.findByRole('dialog', { name: 'Public API' })
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Delete' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(endpointsApi.delete).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Public API' })).toBeInTheDocument()
  })

  it('deletes an endpoint only after confirmation', async () => {
    vi.mocked(endpointsApi.list)
      .mockResolvedValueOnce([makeEndpoint()])
      .mockResolvedValueOnce([])
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<Dashboard />)
    fireEvent.click(await screen.findByText('Public API'))
    const detailDialog = await screen.findByRole('dialog', { name: 'Public API' })
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(endpointsApi.delete).toHaveBeenCalledWith(1))
    expect(await screen.findByText('No endpoints configured')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toggles endpoint activation and filters the updated status', async () => {
    const active = makeEndpoint()
    const inactive = makeEndpoint({ is_active: false })
    vi.mocked(endpointsApi.list)
      .mockResolvedValueOnce([active])
      .mockResolvedValueOnce([inactive])
    vi.mocked(endpointsApi.update).mockResolvedValueOnce(inactive)

    render(<Dashboard />)
    fireEvent.click(await screen.findByRole('button', { name: 'Disable' }))

    await waitFor(() => expect(endpointsApi.update).toHaveBeenCalledWith(1, { is_active: false }))
    expect(await screen.findByRole('button', { name: 'Enable' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Filter endpoint status'), { target: { value: 'active' } })
    expect(screen.getByText('No endpoints match this search and filter.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Filter endpoint status'), { target: { value: 'inactive' } })
    expect(screen.getByText('Public API')).toBeInTheDocument()
  })

  it('blocks manual checks for disabled endpoints in cards and details', async () => {
    vi.mocked(endpointsApi.list).mockResolvedValue([makeEndpoint({ is_active: false })])

    render(<Dashboard />)
    const cardCheck = await screen.findByRole('button', { name: 'Check Now' })
    expect(cardCheck).toBeDisabled()

    fireEvent.click(screen.getByText('Public API'))
    const detailDialog = await screen.findByRole('dialog', { name: 'Public API' })
    expect(within(detailDialog).getByText('This endpoint is disabled. Enable it to run manual checks.')).toBeInTheDocument()
    expect(within(detailDialog).getByRole('button', { name: 'Simulate Success' })).toBeDisabled()
    expect(within(detailDialog).getByRole('button', { name: 'Simulate Failure' })).toBeDisabled()
    expect(within(detailDialog).getByRole('button', { name: 'Check Now (Random)' })).toBeDisabled()
    expect(endpointsApi.check).not.toHaveBeenCalled()
  })

  it('searches by endpoint name and URL', async () => {
    vi.mocked(endpointsApi.list).mockResolvedValue([
      makeEndpoint(),
      makeEndpoint({ id: 2, name: 'Billing', url: 'https://billing.example.com' }),
    ])

    render(<Dashboard />)
    await screen.findByText('Public API')
    const search = screen.getByPlaceholderText('Search endpoints or URLs…')

    fireEvent.change(search, { target: { value: 'billing.example.com' } })
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.queryByText('Public API')).not.toBeInTheDocument()
  })

  it('runs a random manual check from the endpoint card and refreshes the summary', async () => {
    const endpoint = makeEndpoint()
    let results: MonitoringResult[] = []
    vi.mocked(endpointsApi.list).mockResolvedValue([endpoint])
    vi.mocked(endpointsApi.getResults).mockImplementation(async () => results)
    vi.mocked(endpointsApi.check).mockImplementationOnce(async () => {
      const result = makeResult({ status: 'success', status_code: 200 })
      results = [result]
      return result
    })

    render(<Dashboard />)
    await screen.findByRole('button', { name: 'Check Now' })
    const checksCard = screen.getByText('Recent checks').closest('.summary-card')
    expect(checksCard).not.toBeNull()
    expect(within(checksCard as HTMLElement).getByText('0')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Check Now' }))

    await waitFor(() => {
      expect(endpointsApi.check).toHaveBeenCalledWith(1, undefined)
      expect(within(checksCard as HTMLElement).getByText('1')).toBeInTheDocument()
      expect(endpointsApi.getResults).toHaveBeenCalledTimes(2)
    })
  })

  it('refreshes detail history and statistics after a simulated check', async () => {
    const endpoint = makeEndpoint()
    let results: MonitoringResult[] = []
    vi.mocked(endpointsApi.list).mockResolvedValue([endpoint])
    vi.mocked(endpointsApi.getResults).mockImplementation(async () => results)
    vi.mocked(endpointsApi.getStats).mockImplementation(async () => ({
      total_checks: results.length,
      success_count: results.filter(result => result.status === 'success').length,
      failure_count: results.filter(result => result.status === 'failure').length,
      success_rate: results.length ? 0 : 0,
      avg_response_time: results.length ? 450 : null,
      uptime_percentage: results.length ? 0 : 0,
    }))
    vi.mocked(endpointsApi.check).mockImplementationOnce(async (_id, forceStatus) => {
      const result = makeResult({ status: forceStatus ?? 'failure' })
      results = [result]
      return result
    })

    render(<Dashboard />)
    fireEvent.click(await screen.findByText('Public API'))
    const detailDialog = await screen.findByRole('dialog', { name: 'Public API' })
    expect(within(detailDialog).getByText('No checks yet')).toBeInTheDocument()

    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Simulate Failure' }))

    await waitFor(() => {
      expect(endpointsApi.check).toHaveBeenCalledWith(1, 'failure')
      expect(within(detailDialog).getAllByText('450ms').length).toBeGreaterThan(0)
      expect(within(detailDialog).getByText('503')).toBeInTheDocument()
    })
    expect(within(detailDialog).queryByText('No checks yet')).not.toBeInTheDocument()
  })

  it('acknowledges and resolves an incident', async () => {
    vi.mocked(endpointsApi.list).mockResolvedValue([makeEndpoint()])
    let incident = makeIncident()
    vi.mocked(endpointsApi.getIncidents).mockImplementation(async () => [incident])
    vi.mocked(endpointsApi.updateIncident).mockImplementation(async (_id, status) => {
      incident = makeIncident({
        status,
        updated_at: timestamp,
        resolved_at: status === 'resolved' ? timestamp : null,
      })
      return incident
    })

    render(<Dashboard />)
    await screen.findByText('Incident #7')
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }))
    await waitFor(() => expect(endpointsApi.updateIncident).toHaveBeenCalledWith(7, 'acknowledged'))
    expect(await screen.findByText('ACKNOWLEDGED')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    await waitFor(() => expect(endpointsApi.updateIncident).toHaveBeenCalledWith(7, 'resolved'))
    expect(await screen.findByText('RESOLVED')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
  })
})
