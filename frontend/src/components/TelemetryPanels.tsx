import type { Endpoint, MonitoringResult } from '../types'

type TelemetryPanelsProps = {
  endpoints: Endpoint[]
  results: MonitoringResult[]
}

const HOUR_MS = 60 * 60 * 1000

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatLatency(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : `${Math.round(value)} ms`
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export default function TelemetryPanels({ endpoints, results }: TelemetryPanelsProps) {
  const now = Date.now()
  const validResults = results
    .filter(result => !Number.isNaN(new Date(result.checked_at).getTime()))
    .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())
  const sixHourResults = validResults.filter(result => {
    const age = now - new Date(result.checked_at).getTime()
    return age >= 0 && age <= 6 * HOUR_MS
  })
  const successCount = validResults.filter(result => result.status === 'success').length
  const failureCount = validResults.filter(result => result.status === 'failure').length
  const successRate = validResults.length ? (successCount / validResults.length) * 100 : null
  const errorRate = validResults.length ? (failureCount / validResults.length) * 100 : null
  const medianLatency = median(validResults
    .map(result => result.response_time)
    .filter((value): value is number => value !== null && Number.isFinite(value)))
  const bucketCounts = Array.from({ length: 6 }, (_, index) => {
    const ageHours = 5 - index
    const lowerBound = ageHours * HOUR_MS
    const upperBound = (ageHours + 1) * HOUR_MS
    return {
      label: index === 5 ? 'Now' : `${ageHours}h`,
      count: sixHourResults.filter(result => {
        const age = now - new Date(result.checked_at).getTime()
        return age >= lowerBound && age < upperBound
      }).length,
    }
  })
  const maxBucketCount = Math.max(1, ...bucketCounts.map(bucket => bucket.count))
  const endpointNames = new Map(endpoints.map(endpoint => [endpoint.id, endpoint.name]))
  const latestResults = validResults.slice(0, 6)

  return (
    <section className="telemetry-grid" aria-label="Recent check telemetry">
      <article className="telemetry-card">
        <div className="telemetry-card-header">
          <div>
            <p className="telemetry-kicker">ACTIVITY · LAST 6 HOURS</p>
            <h2>Check activity</h2>
            <p className="telemetry-subtitle">{sixHourResults.length} recorded check{sixHourResults.length === 1 ? '' : 's'} in this window</p>
          </div>
          <span className="telemetry-icon" aria-hidden="true">▥</span>
        </div>
        {sixHourResults.length > 0 ? (
          <div className="activity-chart" role="img" aria-label={`Recorded checks per hour: ${bucketCounts.map(bucket => `${bucket.label} ${bucket.count}`).join(', ')}`}>
            <div className="activity-bars">
              {bucketCounts.map(bucket => (
                <div className="activity-column" key={bucket.label} title={`${bucket.count} recorded checks ${bucket.label === 'Now' ? 'in the last hour' : `${bucket.label} ago`}`}>
                  <span className="activity-count">{bucket.count}</span>
                  <span className="activity-track"><span className="activity-bar" style={{ height: `${Math.max(bucket.count > 0 ? 8 : 2, (bucket.count / maxBucketCount) * 100)}%` }} /></span>
                  <span className="activity-label">{bucket.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="telemetry-empty">
            <span className="telemetry-empty-mark" aria-hidden="true">⌁</span>
            <strong>No checks recorded in the last 6 hours</strong>
            <span>Run a manual check on an endpoint to populate this chart.</span>
          </div>
        )}
        <p className="telemetry-footnote">Stored check executions only — not incoming application request traffic.</p>
      </article>

      <article className="telemetry-card">
        <div className="telemetry-card-header">
          <div>
            <p className="telemetry-kicker">QUALITY SIGNALS · RECENT HISTORY</p>
            <h2>Reliability signals</h2>
            <p className="telemetry-subtitle">Computed from the latest saved check results</p>
          </div>
          <span className="telemetry-icon telemetry-icon--mint" aria-hidden="true">⌁</span>
        </div>
        <div className="quality-list">
          <div className="quality-row">
            <div className="quality-copy"><span>Sample check success</span><small>{validResults.length ? `${successCount} of ${validResults.length} saved checks` : 'No saved checks yet'}</small></div>
            <strong className={successRate === null ? 'quality-value is-muted' : 'quality-value is-good'}>{successRate === null ? '—' : `${successRate.toFixed(1)}%`}</strong>
          </div>
          <div className="quality-row">
            <div className="quality-copy"><span>Check error rate</span><small>{validResults.length ? `${failureCount} failed check${failureCount === 1 ? '' : 's'} in the loaded history` : 'No saved checks yet'}</small></div>
            <strong className={errorRate === null ? 'quality-value is-muted' : errorRate > 0 ? 'quality-value is-bad' : 'quality-value is-good'}>{errorRate === null ? '—' : `${errorRate.toFixed(1)}%`}</strong>
          </div>
          <div className="quality-row">
            <div className="quality-copy"><span>Median response time</span><small>{medianLatency === null ? 'No response times recorded' : `${validResults.filter(result => result.response_time !== null).length} measurements`}</small></div>
            <strong className="quality-value">{formatLatency(medianLatency)}</strong>
          </div>
        </div>
        <p className="telemetry-footnote">Check outcomes are simulated by this project. These are not production uptime or live service SLAs.</p>
      </article>

      <article className="telemetry-card telemetry-log-card">
        <div className="telemetry-card-header">
          <div>
            <p className="telemetry-kicker">EVENT STREAM</p>
            <h2>Recent check log</h2>
            <p className="telemetry-subtitle">Latest persisted check results across configured endpoints</p>
          </div>
          <span className="telemetry-log-count">{latestResults.length} events</span>
        </div>
        {latestResults.length ? (
          <div className="telemetry-table-wrap">
            <table className="telemetry-table">
              <thead>
                <tr><th scope="col">RESULT</th><th scope="col">ENDPOINT</th><th scope="col">HTTP CODE</th><th scope="col">LATENCY</th><th scope="col">TIME</th></tr>
              </thead>
              <tbody>
                {latestResults.map(result => (
                  <tr key={result.id} title={result.error_message ?? undefined}>
                    <td><span className={`log-status log-status--${result.status}`}>{result.status === 'success' ? 'Success' : 'Failure'}</span></td>
                    <td><span className="log-endpoint">{endpointNames.get(result.endpoint_id) ?? `Endpoint #${result.endpoint_id}`}</span><small className="log-event-id">check:{result.id}</small></td>
                    <td className="log-mono">{result.status_code ?? '—'}</td>
                    <td className="log-mono">{formatLatency(result.response_time)}</td>
                    <td className="log-time">{formatTime(result.checked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="telemetry-empty telemetry-empty--compact">
            <strong>No check logs yet</strong>
            <span>Recorded results will appear after you run an endpoint check.</span>
          </div>
        )}
      </article>
    </section>
  )
}
