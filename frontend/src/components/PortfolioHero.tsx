import './PortfolioHero.css'

const engineeringHighlights = [
  {
    number: '01',
    label: 'API DESIGN',
    title: 'Typed, explicit contracts',
    description: 'FastAPI endpoints, Pydantic validation, and a browsable REST interface.',
  },
  {
    number: '02',
    label: 'DATA LAYER',
    title: 'Models that persist',
    description: 'SQLAlchemy and SQLite for endpoint records, check history, and incidents.',
  },
  {
    number: '03',
    label: 'PRODUCT UX',
    title: 'Designed for failure states',
    description: 'Search, filters, retry states, response history, and incident actions.',
  },
  {
    number: '04',
    label: 'DELIVERY',
    title: 'Repeatable quality gates',
    description: 'Automated tests, lint/build, dependency audits, and Docker smoke checks.',
  },
]

function PulseMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M7 19.5a5 5 0 0 1 .8-9.9A7.5 7.5 0 0 1 21.9 11a4.4 4.4 0 0 1 1.2 8.5H7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11 15.5 3.2 3.1 6.3-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PortfolioHero() {
  return (
    <section className="portfolio-hero" aria-labelledby="portfolio-heading">
      <div className="portfolio-hero__wrap">
        <header className="portfolio-hero__nav">
          <a className="portfolio-hero__brand" href="#portfolio-heading" aria-label="CloudPulse project home">
            <span className="portfolio-hero__mark"><PulseMark /></span>
            <span>cloud<span className="portfolio-hero__brand-accent">pulse</span></span>
          </a>
          <div className="portfolio-hero__nav-right">
            <span className="portfolio-hero__project-tag"><i /> Full-stack engineering project</span>
            <a href="https://github.com/Emmy1-tech/CloudPulse" target="_blank" rel="noreferrer" className="portfolio-hero__source-link">
              Source code <span aria-hidden="true">↗</span>
            </a>
          </div>
        </header>

        <div className="portfolio-hero__main">
          <div className="portfolio-hero__copy">
            <p className="portfolio-hero__eyebrow">OBSERVABILITY CONSOLE <span> / </span> 2026</p>
            <h1 id="portfolio-heading">Make system health <span>impossible to miss.</span></h1>
            <p className="portfolio-hero__description">
              CloudPulse is a full-stack observability console prototype that brings endpoint inventory,
              response-time history, and incident workflows into one focused workspace. Built with
              React and TypeScript, FastAPI, SQLAlchemy, and SQLite.
            </p>
            <p className="portfolio-hero__scope">
              <span className="portfolio-hero__scope-dot" />
              Public demo uses simulated sample telemetry — it does not probe real services.
            </p>
            <div className="portfolio-hero__actions">
              <a href="#overview" className="portfolio-hero__button portfolio-hero__button--primary">
                Explore the dashboard <span aria-hidden="true">↓</span>
              </a>
              <a href="https://github.com/Emmy1-tech/CloudPulse/blob/main/ENGINEERING_REVIEW.md" target="_blank" rel="noreferrer" className="portfolio-hero__button portfolio-hero__button--secondary">
                Read the engineering review <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="portfolio-hero__stack" aria-label="Technology stack">
              <span>React + TypeScript</span>
              <span>FastAPI + Pydantic</span>
              <span>SQLAlchemy + SQLite</span>
              <span>Docker + GitHub Actions</span>
            </div>
          </div>

          <div className="portfolio-hero__visual" aria-label="Illustrative CloudPulse monitoring dashboard preview">
            <div className="portfolio-hero__visual-top">
              <div className="portfolio-hero__visual-title"><span className="portfolio-hero__mini-mark"><PulseMark /></span><span>Workspace overview<small>PROJECT PREVIEW</small></span></div>
              <span className="portfolio-hero__sample-pill"><i /> SAMPLE DATA</span>
            </div>

            <div className="portfolio-hero__metric-grid">
              <article className="portfolio-hero__metric"><span>Endpoints</span><strong>08 <small>services</small></strong><em>Inventory</em></article>
              <article className="portfolio-hero__metric"><span>Median response</span><strong>142 <small>ms</small></strong><em>Illustrative</em></article>
              <article className="portfolio-hero__metric"><span>Open incidents</span><strong>02 <small>to review</small></strong><em>Sample state</em></article>
            </div>

            <div className="portfolio-hero__chart-card">
              <div className="portfolio-hero__chart-heading"><span>Response-time trend</span><small>ILLUSTRATIVE · 24H</small></div>
              <svg className="portfolio-hero__chart" viewBox="0 0 440 150" role="img" aria-label="Illustrative response-time trend line chart">
                <defs>
                  <linearGradient id="cpChartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#7ce7d1" stopOpacity=".25" />
                    <stop offset="100%" stopColor="#7ce7d1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g stroke="#d8e7ff" strokeOpacity=".12" strokeDasharray="4 6">
                  <path d="M0 24H440 M0 54H440 M0 84H440 M0 114H440" />
                </g>
                <path d="M0 120 L22 102 L44 107 L65 72 L86 83 L108 62 L130 77 L151 43 L173 61 L196 67 L218 35 L240 49 L260 25 L283 45 L305 62 L326 39 L349 51 L370 22 L393 34 L415 15 L440 28 L440 140 L0 140Z" fill="url(#cpChartFill)" />
                <path d="M0 120 L22 102 L44 107 L65 72 L86 83 L108 62 L130 77 L151 43 L173 61 L196 67 L218 35 L240 49 L260 25 L283 45 L305 62 L326 39 L349 51 L370 22 L393 34 L415 15 L440 28" fill="none" stroke="#7ce7d1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="415" cy="15" r="5" fill="#7ce7d1" stroke="#162943" strokeWidth="3" />
                <g fill="#91a9c5" fontSize="9">
                  <text x="0" y="149">00:00</text><text x="142" y="149">08:00</text><text x="288" y="149">16:00</text><text x="408" y="149">24:00</text>
                </g>
              </svg>
            </div>

            <div className="portfolio-hero__service-list">
              <div className="portfolio-hero__service"><i /><span><strong>Public API</strong><small>EXAMPLE STATE</small></span><b>86 ms</b></div>
              <div className="portfolio-hero__service"><i className="is-warning" /><span><strong>Checkout API</strong><small>EXAMPLE STATE</small></span><b>328 ms</b></div>
            </div>
            <p className="portfolio-hero__visual-note">Product illustration only. Figures are not measured against live services.</p>
          </div>
        </div>

        <div className="portfolio-hero__highlights" aria-label="Engineering highlights">
          {engineeringHighlights.map((item) => (
            <article className="portfolio-hero__highlight" key={item.number}>
              <span className="portfolio-hero__highlight-number">{item.number} <i>/ {item.label}</i></span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PortfolioHero
