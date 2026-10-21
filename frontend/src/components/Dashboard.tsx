import { useState, useEffect } from 'react'
import { endpointsApi } from '../services/api'
import { Endpoint, Incident, EndpointCreate, EndpointUpdate, MonitoringResult, EndpointStats } from '../types'
import './Dashboard.css'
import '../App.css'

export default function Dashboard() {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [recentResults, setRecentResults] = useState<MonitoringResult[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)

  const loadEndpoints = async () => {
    setLoadError(null)
    try {
      const data = await endpointsApi.list()
      setEndpoints(data)

      // One endpoint's history should not hide the rest of the workspace if it fails.
      const [incidentGroups, resultGroups] = await Promise.all([
        Promise.all(data.map(endpoint => endpointsApi.getIncidents(endpoint.id).catch(() => [] as Incident[]))),
        Promise.all(data.map(endpoint => endpointsApi.getResults(endpoint.id, 20).catch(() => [] as MonitoringResult[]))),
      ])
      setIncidents(incidentGroups.flat().sort((a, b) => b.created_at.localeCompare(a.created_at)))
      setRecentResults(resultGroups.flat().sort((a, b) => b.checked_at.localeCompare(a.checked_at)).slice(0, 30))
    } catch (error) {
      console.error('Failed to load endpoints:', error)
      setLoadError('CloudPulse could not load workspace data. Check the API connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEndpoints()
  }, [])

  const handleCreate = async (data: EndpointCreate): Promise<void> => {
    await endpointsApi.create(data)
    setShowForm(false)
    await loadEndpoints()
  }

  const handleDelete = async (id: number): Promise<boolean> => {
    if (!confirm('Are you sure you want to delete this endpoint?')) return false

    try {
      await endpointsApi.delete(id)
      await loadEndpoints()
      return true
    } catch (error) {
      console.error('Failed to delete endpoint:', error)
      setLoadError('Could not delete the endpoint. Please retry.')
      return false
    }
  }

  const handleCheck = async (id: number, forceStatus?: 'success' | 'failure'): Promise<void> => {
    const endpoint = endpoints.find(item => item.id === id)
    if (endpoint && !endpoint.is_active) {
      setLoadError('Enable this endpoint before running a check.')
      return
    }
    try {
      await endpointsApi.check(id, forceStatus)
      await loadEndpoints()
    } catch (error) {
      console.error('Failed to check endpoint:', error)
      setLoadError('Could not record the simulated check. Please retry.')
    }
  }

  const handleUpdate = async (id: number, data: EndpointUpdate): Promise<void> => {
    await endpointsApi.update(id, data)
    setEditingEndpoint(null)
    setShowForm(false)
    await loadEndpoints()
  }

  const handleToggleEndpoint = async (endpoint: Endpoint): Promise<void> => {
    try {
      await endpointsApi.update(endpoint.id, { is_active: !endpoint.is_active })
      await loadEndpoints()
    } catch (error) {
      console.error('Failed to update endpoint status:', error)
      setLoadError('Could not update the endpoint status. Please retry.')
    }
  }

  const handleAcknowledgeIncident = async (incidentId: number) => {
    try {
      await endpointsApi.updateIncident(incidentId, 'acknowledged')
      await loadEndpoints()
    } catch (error) {
      console.error('Failed to acknowledge incident:', error)
      setLoadError('Could not acknowledge the incident. Please retry.')
    }
  }

  const handleResolveIncident = async (incidentId: number) => {
    try {
      await endpointsApi.updateIncident(incidentId, 'resolved')
      await loadEndpoints()
    } catch (error) {
      console.error('Failed to resolve incident:', error)
      setLoadError('Could not resolve the incident. Please retry.')
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'acknowledged')
  const currentSelectedEndpoint = selectedEndpoint
    ? endpoints.find(endpoint => endpoint.id === selectedEndpoint.id) ?? selectedEndpoint
    : null
  const filteredEndpoints = endpoints.filter(endpoint => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery = !query || endpoint.name.toLowerCase().includes(query) || endpoint.url.toLowerCase().includes(query)
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? endpoint.is_active : !endpoint.is_active)
    return matchesQuery && matchesStatus
  })
  const responseSeries = recentResults
    .filter(result => result.response_time !== null)
    .slice(0, 12)
    .reverse()
  const responseValues = responseSeries.map(result => result.response_time ?? 0)
  const responseMin = responseValues.length ? Math.min(...responseValues) : 0
  const responseMax = responseValues.length ? Math.max(...responseValues) : 0
  const responsePolyline = responseSeries.map((result, index) => {
    const x = responseSeries.length < 2 ? 50 : 8 + (index / (responseSeries.length - 1)) * 184
    const value = result.response_time ?? 0
    const y = 78 - ((value - responseMin) / Math.max(1, responseMax - responseMin)) * 54
    return `${x},${y}`
  }).join(' ')
  const recentChecks = recentResults.length
  const failedChecks = recentResults.filter(result => result.status === 'failure').length

  return (
    <div className="app-container">
      <header className="header" id="overview">
        <div className="header-topline">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 15.5a4.5 4.5 0 0 1 .6-9A6.5 6.5 0 0 1 18 8a3.8 3.8 0 0 1 1 7.5H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>CloudPulse</span>
          </div>
          <span className="environment-pill">{isDemoMode ? 'Public demo' : 'Local API workspace'}</span>
        </div>
        <div className="header-copy">
          <p className="eyebrow">OPERATIONS OVERVIEW</p>
          <h1>Your services, at a glance.</h1>
          <p className="subtitle">
            A clear view of your registered endpoints and incident activity.
            Monitoring outcomes are simulated in both modes.{' '}
            {isDemoMode
              ? 'This browser stores illustrative sample data locally.'
              : 'The configured API stores this workspace but does not contact listed URLs.'}
          </p>
        </div>
        {openIncidents.length > 0 && (
          <div className="alert-banner" role="status">
            <strong>{openIncidents.length} active incident{openIncidents.length > 1 ? 's' : ''} need attention</strong>
          </div>
        )}
      </header>

      {loadError && (
        <div className="error-banner" role="alert">
          <span>{loadError}</span>
          <button className="button" onClick={() => void loadEndpoints()}>Retry</button>
        </div>
      )}

      <section className="summary-grid" aria-label="Monitoring summary">
        <article className="summary-card">
          <span className="summary-label">Registered endpoints</span>
          <strong className="summary-value">{endpoints.length}</strong>
          <span className="summary-note">Services configured in this workspace</span>
        </article>
        <article className="summary-card active">
          <span className="summary-label">Active endpoints</span>
          <strong className="summary-value">{endpoints.filter(endpoint => endpoint.is_active).length}</strong>
          <span className="summary-note">Enabled for manual checks</span>
        </article>
        <article className="summary-card incidents">
          <span className="summary-label">Open incidents</span>
          <strong className="summary-value">{openIncidents.length}</strong>
          <span className="summary-note">{openIncidents.length === 0 ? 'No unresolved incidents' : 'Require review or resolution'}</span>
        </article>
        <article className="summary-card checks">
          <span className="summary-label">Recent checks</span>
          <strong className="summary-value">{recentChecks}</strong>
          <span className="summary-note">{failedChecks} simulated failure{failedChecks === 1 ? '' : 's'} in recent history</span>
        </article>
      </section>

      <section className="response-panel" aria-labelledby="response-title">
        <div className="response-panel-heading">
          <div>
            <p className="eyebrow">CHECK HISTORY</p>
            <h2 id="response-title">Response-time trend</h2>
            <p className="section-description">Recorded checks only. Results are simulated in this portfolio project.</p>
          </div>
          <span className="chart-unit">MILLISECONDS</span>
        </div>
        {responseSeries.length > 1 ? (
          <div className="response-chart">
            <div className="chart-y-labels"><span>{responseMax} ms</span><span>{Math.round((responseMax + responseMin) / 2)} ms</span><span>{responseMin} ms</span></div>
            <svg viewBox="0 0 200 90" role="img" aria-label="Response time trend from recent recorded checks" preserveAspectRatio="none">
              <defs>
                <linearGradient id="response-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#69dec3" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#69dec3" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M ${responsePolyline.split(' ').join(' L ')} L 192 88 L 8 88 Z`} fill="url(#response-fill)" />
              <polyline points={responsePolyline} fill="none" stroke="#48cdb0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {responseSeries.map((result, index) => {
                const x = responseSeries.length < 2 ? 50 : 8 + (index / (responseSeries.length - 1)) * 184
                const value = result.response_time ?? 0
                const y = 78 - ((value - responseMin) / Math.max(1, responseMax - responseMin)) * 54
                return <circle key={result.id} cx={x} cy={y} r="2.2" fill="#d5fff5" stroke="#249c85" strokeWidth="1.4" />
              })}
            </svg>
            <div className="chart-x-labels"><span>Older checks</span><span>Most recent</span></div>
          </div>
        ) : (
          <div className="chart-empty">Run a check on an endpoint to build a response-time trend from recorded results.</div>
        )}
      </section>

      <div className="section-heading">
        <div>
          <h2>Workspace actions</h2>
          <p className="section-description">Manage the services connected to your CloudPulse workspace.</p>
        </div>
        <div className="actions">
        <button 
          className="button button-primary"
          onClick={() => setShowForm(true)}
        >
          + Add Endpoint
        </button>
        </div>
      </div>

      {showForm && (
        <EndpointForm
          endpoint={editingEndpoint}
          onSave={editingEndpoint
            ? (data: EndpointCreate) => handleUpdate(editingEndpoint.id, data)
            : handleCreate}
          onCancel={() => {
            setShowForm(false)
            setEditingEndpoint(null)
          }}
        />
      )}

      {currentSelectedEndpoint && (
        <EndpointDetail
          endpoint={currentSelectedEndpoint}
          onClose={() => setSelectedEndpoint(null)}
          onCheck={(forceStatus) => handleCheck(currentSelectedEndpoint.id, forceStatus)}
          onToggle={() => handleToggleEndpoint(currentSelectedEndpoint)}
          onDelete={async () => {
            const deleted = await handleDelete(currentSelectedEndpoint.id)
            if (deleted) setSelectedEndpoint(null)
          }}
          onEdit={() => {
            setEditingEndpoint(currentSelectedEndpoint)
            setShowForm(true)
            setSelectedEndpoint(null)
          }}
        />
      )}

      <div className="incidents-section" id="incidents">
        <div className="section-heading">
          <div>
            <h2>Incident activity</h2>
            <p className="section-description">Review recent alerts and resolve items that are no longer active.</p>
          </div>
        </div>
        {incidents.length === 0 ? (
          <p className="empty-state">No incidents recorded yet. A simulated failed check can create an incident for demonstration.</p>
        ) : (
          <div className="incidents-list">
            {incidents.map(incident => (
              <div key={incident.id} className={`card incident-card incident-${incident.status}`}>
                <div className="incident-header">
                  <div>
                    <strong>Incident #{incident.id}</strong>
                    <p className="incident-endpoint">{endpoints.find(endpoint => endpoint.id === incident.endpoint_id)?.name ?? `Endpoint #${incident.endpoint_id}`}</p>
                  </div>
                  <span className={`status-badge status-${incident.status === 'resolved' ? 'success' : incident.status === 'acknowledged' ? 'warning' : 'failure'}`}>
                    {incident.status.toUpperCase()}
                  </span>
                </div>
                <p>Created: {new Date(incident.created_at).toLocaleString()}</p>
                {incident.resolved_at && <p>Resolved: {new Date(incident.resolved_at).toLocaleString()}</p>}
                {(incident.status === 'open' || incident.status === 'acknowledged') && (
                  <div className="incident-actions">
                    {incident.status === 'open' && <button className="button" onClick={() => void handleAcknowledgeIncident(incident.id)}>Acknowledge</button>}
                    <button className="button button-success" onClick={() => void handleResolveIncident(incident.id)}>Resolve</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="endpoints-section" id="endpoints">
        <div className="section-heading">
          <div>
            <h2>Endpoint inventory</h2>
            <p className="section-description">Search, filter, inspect, and run an explicitly simulated manual check.</p>
          </div>
        </div>
        <div className="endpoint-toolbar">
          <label className="endpoint-search">
            <span className="sr-only">Search endpoints</span>
            <span aria-hidden="true">⌕</span>
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search endpoints or URLs…" />
          </label>
          <label className="endpoint-filter">
            <span className="sr-only">Filter endpoint status</span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}>
              <option value="all">All statuses</option>
              <option value="active">Enabled</option>
              <option value="inactive">Disabled</option>
            </select>
          </label>
        </div>
        {endpoints.length === 0 && (
          <div className="empty-state">
            <p>No endpoints configured</p>
            <button className="button button-primary" onClick={() => setShowForm(true)}>
              Add your first endpoint
            </button>
          </div>
        )}

        {endpoints.length > 0 && filteredEndpoints.length === 0 && (
          <div className="empty-state">
            <p>No endpoints match this search and filter.</p>
          </div>
        )}

        {filteredEndpoints.length > 0 && (
          <div className="endpoints-grid">
            {filteredEndpoints.map(endpoint => (
              <div key={endpoint.id} className="card endpoint-card" onClick={() => setSelectedEndpoint(endpoint)}>
                <h3>{endpoint.name}</h3>
                <p className="url">{endpoint.url}</p>
                <p className="method">{endpoint.method}</p>
                <div className="status">
                  <span className={`status-badge ${endpoint.is_active ? 'status-success' : 'status-failure'}`}>
                    {endpoint.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="actions">
                  <button
                    className="button button-success"
                    disabled={!endpoint.is_active}
                    title={endpoint.is_active ? 'Run a simulated check' : 'Enable this endpoint before checking'}
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleCheck(endpoint.id)
                    }}
                  >
                    Check Now
                  </button>
                  <button
                    className="button button-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDelete(endpoint.id)
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleToggleEndpoint(endpoint)
                    }}
                  >
                    {endpoint.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="app-footer">
        <span>CloudPulse · Maintained by EMMY</span>
        <span>Demo metrics are illustrative, not real-world uptime data.</span>
      </footer>
    </div>
  )
}

function EndpointForm({ endpoint, onSave, onCancel }: {
  endpoint: Endpoint | null;
  onSave: (data: EndpointCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: endpoint?.name || '',
    url: endpoint?.url || '',
    method: endpoint?.method || 'GET',
    expected_status: endpoint?.expected_status || 200,
    check_interval: endpoint?.check_interval || 60
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Failed to save endpoint:', error)
      setSaveError('Could not save the endpoint. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="endpoint-form-title">
        <h2 id="endpoint-form-title">{endpoint ? 'Edit Endpoint' : 'Add Endpoint'}</h2>
        {saveError && <p className="error-banner" role="alert">{saveError}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="endpoint-name">Name:</label>
            <input
              id="endpoint-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="endpoint-url">URL:</label>
            <input
              id="endpoint-url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="endpoint-method">Method:</label>
            <select
              id="endpoint-method"
              value={formData.method}
              onChange={(e) => setFormData({...formData, method: e.target.value})}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="endpoint-expected-status">Expected Status:</label>
            <input
              id="endpoint-expected-status"
              type="number"
              value={formData.expected_status}
              onChange={(e) => setFormData({...formData, expected_status: parseInt(e.target.value)})}
              min="100"
              max="599"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="endpoint-check-interval">Check Interval (seconds):</label>
            <input
              id="endpoint-check-interval"
              type="number"
              value={formData.check_interval}
              onChange={(e) => setFormData({...formData, check_interval: parseInt(e.target.value)})}
              min="10"
              max="3600"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="button" onClick={onCancel} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EndpointDetail({ endpoint, onClose, onCheck, onToggle, onDelete, onEdit }: {
  endpoint: Endpoint;
  onClose: () => void;
  onCheck: (forceStatus?: 'success' | 'failure') => Promise<void>;
  onToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: () => void;
}) {
  const [results, setResults] = useState<MonitoringResult[]>([])
  const [stats, setStats] = useState<EndpointStats | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const loadData = async () => {
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      const [resultsData, statsData] = await Promise.all([
        endpointsApi.getResults(endpoint.id, 10),
        endpointsApi.getStats(endpoint.id)
      ])
      setResults(resultsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load endpoint details:', error)
      setDetailsError('Could not load check history. Please retry.')
    } finally {
      setDetailsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [endpoint.id])

  const runCheck = async (forceStatus?: 'success' | 'failure') => {
    if (!endpoint.is_active) return
    await onCheck(forceStatus)
    await loadData()
  }

  return (
    <div className="modal-overlay">
      <div className="modal large" role="dialog" aria-modal="true" aria-labelledby="endpoint-detail-title" aria-busy={detailsLoading}>
        <div className="modal-header">
          <h2 id="endpoint-detail-title">{endpoint.name}</h2>
          <button className="button" onClick={onClose} aria-label="Close endpoint details">×</button>
        </div>
        
        <div className="endpoint-info">
          <p><strong>URL:</strong> {endpoint.url}</p>
          <p><strong>Method:</strong> {endpoint.method}</p>
          <p><strong>Expected Status:</strong> {endpoint.expected_status}</p>
          <p><strong>Check Interval:</strong> {endpoint.check_interval}s</p>
        </div>

        {stats && (
          <div className="stats">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-label">Total Checks</span>
                <span className="stat-value">{stats.total_checks}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Success Rate</span>
                <span className="stat-value">{stats.success_rate}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Uptime</span>
                <span className="stat-value">{stats.uptime_percentage}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Avg Response Time</span>
                <span className="stat-value">{stats.avg_response_time === null ? '—' : `${stats.avg_response_time}ms`}</span>
              </div>
            </div>
          </div>
        )}

        <div className="recent-checks">
          <h3>Recent Checks</h3>
          {detailsError ? (
            <p role="alert">{detailsError} <button className="button" onClick={() => void loadData()}>Retry</button></p>
          ) : detailsLoading && results.length === 0 ? (
            <p>Loading check history…</p>
          ) : results.length === 0 ? (
            <p>No checks yet</p>
          ) : (
            <div className="checks-list">
              {results.map(result => (
                <div key={result.id} className={`check-item ${result.status}`}>
                  <span className={`status-badge status-${result.status}`}>
                    {result.status.toUpperCase()}
                  </span>
                  <span>{result.status_code}</span>
                  <span>{result.response_time}ms</span>
                  <span>{new Date(result.checked_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="simulation-controls">
          <h3>Simulation Controls</h3>
          {!endpoint.is_active && (
            <p className="simulation-note" role="status">This endpoint is disabled. Enable it to run manual checks.</p>
          )}
          <p className="simulation-note">
            <strong>⚠️ SIMULATED MONITORING:</strong> Use these buttons to simulate different health check outcomes for demonstration purposes.
          </p>
          <div className="simulation-buttons">
            <button
              className="button button-success"
              disabled={!endpoint.is_active}
              onClick={() => void runCheck('success')}
            >
              Simulate Success
            </button>
            <button
              className="button button-danger"
              disabled={!endpoint.is_active}
              onClick={() => void runCheck('failure')}
            >
              Simulate Failure
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="button button-success" disabled={!endpoint.is_active} onClick={() => void runCheck()}>Check Now (Random)</button>
          <button className="button" onClick={() => void onToggle()}>{endpoint.is_active ? 'Disable endpoint' : 'Enable endpoint'}</button>
          <button className="button" onClick={onEdit}>Edit</button>
          <button className="button button-danger" onClick={onDelete}>Delete</button>
          <button className="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
