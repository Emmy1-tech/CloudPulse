import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TelemetryPanels from '../components/TelemetryPanels'
import type { Endpoint, MonitoringResult } from '../types'

const endpoint: Endpoint = {
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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function makeResult(id: number, status: 'success' | 'failure', minutesAgo: number): MonitoringResult {
  return {
    id,
    endpoint_id: 1,
    status,
    status_code: status === 'success' ? 200 : 503,
    response_time: status === 'success' ? 120 : 820,
    error_message: status === 'success' ? null : 'Illustrative failure',
    checked_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  }
}

describe('TelemetryPanels', () => {
  it('renders the empty state without inventing check activity', () => {
    render(<TelemetryPanels endpoints={[endpoint]} results={[]} />)

    expect(screen.getByText('No checks recorded in the last 6 hours')).toBeInTheDocument()
    expect(screen.getByText('No check logs yet')).toBeInTheDocument()
    expect(screen.getByText('Sample check success').parentElement).toHaveTextContent('—')
    expect(screen.getByText('Check error rate').parentElement).toHaveTextContent('—')
  })

  it('summarizes saved checks and identifies the endpoint in the event log', () => {
    render(<TelemetryPanels endpoints={[endpoint]} results={[makeResult(1, 'success', 5), makeResult(2, 'failure', 15)]} />)

    expect(screen.getByText('2 recorded checks in this window')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('Public API')).toBeInTheDocument()
    expect(screen.getByText('503')).toBeInTheDocument()
    expect(screen.getByText('820 ms')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Failure')).toBeInTheDocument()
  })
})
