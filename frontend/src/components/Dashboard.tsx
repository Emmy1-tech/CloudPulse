import { useState, useEffect } from 'react'
import { endpointsApi } from '../services/api'
import { Endpoint, Incident, EndpointCreate, MonitoringResult, EndpointStats } from '../types'
import './Dashboard.css'
import '../App.css'

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)

  const loadEndpoints = async () => {
    try {
      const data = await endpointsApi.list()
      setEndpoints(data)
      
      // Load incidents for all endpoints
      const incidentGroups = await Promise.all(
        data.map(endpoint => endpointsApi.getIncidents(endpoint.id))
      )
      setIncidents(incidentGroups.flat())
    } catch (error) {
      console.error('Failed to load endpoints:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEndpoints()
  }, [])

  const handleCreate = async (data: EndpointCreate) => {
    try {
      await endpointsApi.create(data)
      setShowForm(false)
      loadEndpoints()
    } catch (error) {
      console.error('Failed to create endpoint:', error)
      alert('Failed to create endpoint')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) return
    
    try {
      await endpointsApi.delete(id)
      loadEndpoints()
    } catch (error) {
      console.error('Failed to delete endpoint:', error)
      alert('Failed to delete endpoint')
    }
  }

  const handleCheck = async (id: number, forceStatus?: 'success' | 'failure') => {
    try {
      await endpointsApi.check(id, forceStatus)
      loadEndpoints()
    } catch (error) {
      console.error('Failed to check endpoint:', error)
      alert('Failed to check endpoint')
    }
  }

  const handleResolveIncident = async (incidentId: number) => {
    try {
      await endpointsApi.updateIncident(incidentId, 'resolved')
      loadEndpoints()
    } catch (error) {
      console.error('Failed to resolve incident:', error)
      alert('Failed to resolve incident')
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'acknowledged')

  return (
    <div className="app-container">
      <div className="header">
        <h1>CloudPulse Dashboard</h1>
        <p className="subtitle">SIMULATED monitoring system for demonstration</p>
        
        {openIncidents.length > 0 && (
          <div className="alert-banner">
            <strong>⚠️ {openIncidents.length} Active Incident{openIncidents.length > 1 ? 's' : ''}</strong>
          </div>
        )}
      </div>

      <div className="actions">
        <button 
          className="button button-primary"
          onClick={() => setShowForm(true)}
        >
          + Add Endpoint
        </button>
      </div>

      {showForm && (
        <EndpointForm
          endpoint={editingEndpoint}
          onSave={editingEndpoint ? async (data: EndpointCreate) => {
            await endpointsApi.update(editingEndpoint.id, data)
            setEditingEndpoint(null)
            setShowForm(false)
            loadEndpoints()
          } : handleCreate}
          onCancel={() => {
            setShowForm(false)
            setEditingEndpoint(null)
          }}
        />
      )}

      {selectedEndpoint && (
        <EndpointDetail
          endpoint={selectedEndpoint}
          onClose={() => setSelectedEndpoint(null)}
          onCheck={(forceStatus) => handleCheck(selectedEndpoint.id, forceStatus)}
          onDelete={() => {
            handleDelete(selectedEndpoint.id)
            setSelectedEndpoint(null)
          }}
          onEdit={() => {
            setEditingEndpoint(selectedEndpoint)
            setShowForm(true)
            setSelectedEndpoint(null)
          }}
        />
      )}

      <div className="incidents-section">
        <h2>Incidents</h2>
        {incidents.length === 0 ? (
          <p className="empty-state">No incidents recorded</p>
        ) : (
          <div className="incidents-list">
            {incidents.map(incident => (
              <div key={incident.id} className={`card incident-card incident-${incident.status}`}>
                <div className="incident-header">
                  <strong>Incident #{incident.id}</strong>
                  <span className={`status-badge status-${incident.status === 'resolved' ? 'success' : 'failure'}`}>
                    {incident.status.toUpperCase()}
                  </span>
                </div>
                <p>Created: {new Date(incident.created_at).toLocaleString()}</p>
                {incident.resolved_at && (
                  <p>Resolved: {new Date(incident.resolved_at).toLocaleString()}</p>
                )}
                {(incident.status === 'open' || incident.status === 'acknowledged') && (
                  <button
                    className="button button-success"
                    onClick={() => handleResolveIncident(incident.id)}
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="endpoints-section">
        <h2>Endpoints</h2>
        {endpoints.length === 0 ? (
          <div className="empty-state">
            <p>No endpoints configured</p>
            <button className="button button-primary" onClick={() => setShowForm(true)}>
              Add your first endpoint
            </button>
          </div>
        ) : (
          <div className="endpoints-grid">
            {endpoints.map(endpoint => (
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
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCheck(endpoint.id)
                    }}
                  >
                    Check Now
                  </button>
                  <button
                    className="button button-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(endpoint.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="app-footer">CloudPulse · Maintained by EMMY</footer>
    </div>
  )
}

function EndpointForm({ endpoint, onSave, onCancel }: {
  endpoint: Endpoint | null;
  onSave: (data: EndpointCreate) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: endpoint?.name || '',
    url: endpoint?.url || '',
    method: endpoint?.method || 'GET',
    expected_status: endpoint?.expected_status || 200,
    check_interval: endpoint?.check_interval || 60
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{endpoint ? 'Edit Endpoint' : 'Add Endpoint'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>URL:</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Method:</label>
            <select
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
            <label>Expected Status:</label>
            <input
              type="number"
              value={formData.expected_status}
              onChange={(e) => setFormData({...formData, expected_status: parseInt(e.target.value)})}
              min="100"
              max="599"
            />
          </div>
          <div className="form-group">
            <label>Check Interval (seconds):</label>
            <input
              type="number"
              value={formData.check_interval}
              onChange={(e) => setFormData({...formData, check_interval: parseInt(e.target.value)})}
              min="10"
              max="3600"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="button button-primary">Save</button>
            <button type="button" className="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EndpointDetail({ endpoint, onClose, onCheck, onDelete, onEdit }: {
  endpoint: Endpoint;
  onClose: () => void;
  onCheck: (forceStatus?: 'success' | 'failure') => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [results, setResults] = useState<MonitoringResult[]>([])
  const [stats, setStats] = useState<EndpointStats | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resultsData, statsData] = await Promise.all([
          endpointsApi.getResults(endpoint.id, 10),
          endpointsApi.getStats(endpoint.id)
        ])
        setResults(resultsData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load endpoint details:', error)
      }
    }
    loadData()
  }, [endpoint.id])

  return (
    <div className="modal-overlay">
      <div className="modal large">
        <div className="modal-header">
          <h2>{endpoint.name}</h2>
          <button className="button" onClick={onClose}>×</button>
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
                <span className="stat-value">{stats.avg_response_time}ms</span>
              </div>
            </div>
          </div>
        )}

        <div className="recent-checks">
          <h3>Recent Checks</h3>
          {results.length === 0 ? (
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
          <p className="simulation-note">
            <strong>⚠️ SIMULATED MONITORING:</strong> Use these buttons to simulate different health check outcomes for demonstration purposes.
          </p>
          <div className="simulation-buttons">
            <button
              className="button button-success"
              onClick={() => onCheck && onCheck('success')}
            >
              Simulate Success
            </button>
            <button
              className="button button-danger"
              onClick={() => onCheck && onCheck('failure')}
            >
              Simulate Failure
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="button button-success" onClick={() => onCheck && onCheck()}>Check Now (Random)</button>
          <button className="button" onClick={onEdit}>Edit</button>
          <button className="button button-danger" onClick={onDelete}>Delete</button>
          <button className="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
