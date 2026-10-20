import { useState } from 'react'
import Dashboard from './components/Dashboard'
import PortfolioHero from './components/PortfolioHero'

const navigation = [
  { href: '#overview', label: 'Overview', icon: '◫' },
  { href: '#endpoints', label: 'Endpoints', icon: '⌁' },
  { href: '#incidents', label: 'Incidents', icon: '△' },
]

function App() {
  const [activeSection, setActiveSection] = useState('#overview')
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  return (
    <>
      <PortfolioHero />
      <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="sidebar-brand" href="#overview" aria-label="CloudPulse home">
          <span className="sidebar-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 19.5a5 5 0 0 1 .8-9.9A7.5 7.5 0 0 1 21.9 11a4.4 4.4 0 0 1 1.2 8.5H7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="m11 15.5 3.2 3.1 6.3-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="sidebar-wordmark">cloud<span>pulse</span><small>OBSERVABILITY CONSOLE</small></span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          {navigation.map((item, index) => (
            <a key={item.href} className={activeSection === item.href ? 'nav-link active' : 'nav-link'} href={item.href} onClick={() => setActiveSection(item.href)}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {index === 0 && <span className="nav-current" aria-hidden="true" />}
            </a>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="environment-card">
          <span className="environment-icon" aria-hidden="true">⌘</span>
          <div><strong>{isDemoMode ? 'Public demo workspace' : 'Local API workspace'}</strong><span>{isDemoMode ? 'Illustrative sample data' : 'Backend-connected development'}</span></div>
          <span className="live-dot" />
        </div>
        <div className="sidebar-profile">
          <div className="profile-avatar">E</div>
          <div className="profile-copy"><strong>EMMY</strong><span>Project owner</span></div>
          <span className="profile-menu" aria-hidden="true">···</span>
        </div>
      </aside>
      <main className="main-panel">
        <div className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-meta"><span className="api-indicator"><i /> {isDemoMode ? "Demo data only" : "API workspace"}</span><span className="topbar-divider" /><span className="topbar-version">CLOUDPULSE <b>v0.1</b></span></div>
        </div>
        <Dashboard />
      </main>
      </div>
    </>
  )
}

export default App
