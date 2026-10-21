import type { Endpoint, EndpointCreate, EndpointStats, EndpointUpdate, Incident, MonitoringResult } from '../types'

type DemoState = {
  endpoints: Endpoint[]
  results: MonitoringResult[]
  incidents: Incident[]
  nextEndpointId: number
  nextResultId: number
  nextIncidentId: number
}

const STORAGE_KEY = 'cloudpulse-demo-v1'
let memoryState: DemoState | null = null

function seedState(): DemoState {
  const now = Date.now()
  const timestamp = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString()
  const endpoints: Endpoint[] = [
    { id: 1, user_id: 1, name: 'Public API', url: 'https://api.example.com/health', method: 'GET', headers: null, body: null, expected_status: 200, check_interval: 60, is_active: true, created_at: timestamp(720), updated_at: timestamp(5) },
    { id: 2, user_id: 1, name: 'Payments service', url: 'https://payments.example.com/health', method: 'GET', headers: null, body: null, expected_status: 200, check_interval: 120, is_active: true, created_at: timestamp(680), updated_at: timestamp(18) },
    { id: 3, user_id: 1, name: 'Edge gateway', url: 'https://edge.example.com/ping', method: 'GET', headers: null, body: null, expected_status: 200, check_interval: 300, is_active: false, created_at: timestamp(600), updated_at: timestamp(90) },
  ]
  const results: MonitoringResult[] = [
    { id: 1, endpoint_id: 1, status: 'success', status_code: 200, response_time: 118, error_message: null, checked_at: timestamp(6) },
    { id: 2, endpoint_id: 1, status: 'success', status_code: 200, response_time: 124, error_message: null, checked_at: timestamp(31) },
    { id: 3, endpoint_id: 1, status: 'success', status_code: 200, response_time: 109, error_message: null, checked_at: timestamp(56) },
    { id: 4, endpoint_id: 2, status: 'failure', status_code: 503, response_time: 842, error_message: 'Illustrative upstream timeout', checked_at: timestamp(18) },
    { id: 5, endpoint_id: 2, status: 'success', status_code: 200, response_time: 205, error_message: null, checked_at: timestamp(48) },
    { id: 6, endpoint_id: 3, status: 'success', status_code: 200, response_time: 76, error_message: null, checked_at: timestamp(90) },
  ]
  const incidents: Incident[] = [
    { id: 1, endpoint_id: 2, status: 'open', created_at: timestamp(18), updated_at: timestamp(18), resolved_at: null },
  ]
  return { endpoints, results, incidents, nextEndpointId: 4, nextResultId: 7, nextIncidentId: 2 }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readState(): DemoState {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored) as DemoState
    } catch {
      // Private browsing or disabled storage: keep the demo usable in memory.
    }
  }
  if (!memoryState) memoryState = seedState()
  return clone(memoryState)
}

function writeState(state: DemoState): void {
  memoryState = clone(state)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Changes still work for the current page session if storage is unavailable.
    }
  }
}

function findEndpoint(state: DemoState, id: number): Endpoint {
  const endpoint = state.endpoints.find((item) => item.id === id)
  if (!endpoint) throw new Error('Endpoint not found in demo workspace.')
  return endpoint
}

export const demoApi = {
  list: async (): Promise<Endpoint[]> => clone(readState().endpoints),

  create: async (data: EndpointCreate): Promise<Endpoint> => {
    const state = readState()
    const now = new Date().toISOString()
    const endpoint: Endpoint = {
      id: state.nextEndpointId++, user_id: 1, name: data.name, url: data.url,
      method: data.method ?? 'GET', headers: data.headers ?? null, body: data.body ?? null,
      expected_status: data.expected_status ?? 200, check_interval: data.check_interval ?? 60,
      is_active: true, created_at: now, updated_at: now,
    }
    state.endpoints.push(endpoint)
    writeState(state)
    return clone(endpoint)
  },

  get: async (id: number): Promise<Endpoint> => clone(findEndpoint(readState(), id)),

  update: async (id: number, data: EndpointUpdate): Promise<Endpoint> => {
    const state = readState()
    const endpoint = findEndpoint(state, id)
    Object.assign(endpoint, data, { updated_at: new Date().toISOString() })
    writeState(state)
    return clone(endpoint)
  },

  delete: async (id: number): Promise<void> => {
    const state = readState()
    state.endpoints = state.endpoints.filter((item) => item.id !== id)
    state.results = state.results.filter((item) => item.endpoint_id !== id)
    state.incidents = state.incidents.filter((item) => item.endpoint_id !== id)
    writeState(state)
  },

  check: async (id: number, forceStatus?: 'success' | 'failure'): Promise<MonitoringResult> => {
    const state = readState()
    const endpoint = findEndpoint(state, id)
    if (!endpoint.is_active) {
      throw new Error('This endpoint is disabled. Enable it before running a check.')
    }
    const status = forceStatus ?? (Math.random() > 0.12 ? 'success' : 'failure')
    const checkedAt = new Date().toISOString()
    const result: MonitoringResult = {
      id: state.nextResultId++, endpoint_id: id, status,
      status_code: status === 'success' ? 200 : 503,
      response_time: status === 'success' ? Math.round(65 + Math.random() * 180) : Math.round(500 + Math.random() * 700),
      error_message: status === 'success' ? null : 'Illustrative simulated failure — no network request was sent.',
      checked_at: checkedAt,
    }
    state.results.push(result)
    if (status === 'failure' && !state.incidents.some((item) => item.endpoint_id === id && item.status !== 'resolved')) {
      state.incidents.push({ id: state.nextIncidentId++, endpoint_id: id, status: 'open', created_at: checkedAt, updated_at: checkedAt, resolved_at: null })
    }
    writeState(state)
    return clone(result)
  },

  getResults: async (id: number, limit = 50): Promise<MonitoringResult[]> => {
    const state = readState()
    findEndpoint(state, id)
    return clone(state.results.filter((item) => item.endpoint_id === id).sort((a, b) => b.checked_at.localeCompare(a.checked_at)).slice(0, limit))
  },

  getIncidents: async (id: number): Promise<Incident[]> => {
    const state = readState()
    findEndpoint(state, id)
    return clone(state.incidents.filter((item) => item.endpoint_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)))
  },

  updateIncident: async (id: number, status: 'acknowledged' | 'resolved'): Promise<Incident> => {
    const state = readState()
    const incident = state.incidents.find((item) => item.id === id)
    if (!incident) throw new Error('Incident not found in demo workspace.')
    const now = new Date().toISOString()
    incident.status = status
    incident.updated_at = now
    incident.resolved_at = status === 'resolved' ? now : null
    writeState(state)
    return clone(incident)
  },

  getStats: async (id: number): Promise<EndpointStats> => {
    const state = readState()
    findEndpoint(state, id)
    const results = state.results.filter((item) => item.endpoint_id === id)
    const successCount = results.filter((item) => item.status === 'success').length
    const failureCount = results.length - successCount
    const responseTimes = results.map((item) => item.response_time).filter((value): value is number => value !== null)
    const successRate = results.length ? (successCount / results.length) * 100 : 0
    const average = responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : null
    return {
      total_checks: results.length, success_count: successCount, failure_count: failureCount,
      success_rate: Math.round(successRate * 100) / 100,
      uptime_percentage: Math.round(successRate * 100) / 100,
      avg_response_time: average === null ? null : Math.round(average),
    }
  },
}
