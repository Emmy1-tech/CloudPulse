# CloudPulse

**CloudPulse** is a local demonstration dashboard for endpoint inventory and incident workflows, maintained by **EMMY**. It uses React and TypeScript in the browser, a FastAPI REST API, SQLAlchemy models, and SQLite persistence.

## Public portfolio demo

The interactive React frontend can be published as a static site at [emmy1-tech.github.io/CloudPulse](https://emmy1-tech.github.io/CloudPulse/) using [GitHub Pages](DEPLOYMENT.md). The hosted build uses clearly labelled sample data stored in each visitor's browser; it does not contact monitored URLs or expose the local FastAPI API. Deployment runs automatically when approved changes are merged into `main`. See [deployment instructions](DEPLOYMENT.md) for setup and safety boundaries.

> **Scope warning:** CloudPulse is not production monitoring software yet. Health checks are simulated rather than sent to configured URLs, authentication and authorization are not implemented, and endpoint data is not isolated by user. Run it locally only; do not expose the API to a network or store sensitive data.

## Current features

- Create, view, update, and delete endpoint records.
- Trigger simulated checks with forced success/failure options.
- Persist check history and calculate success-rate, uptime-style, and response-time statistics from simulated data.
- Open incidents after simulated failures, avoid duplicate open incidents, and acknowledge or resolve incidents.
- Browse the REST API using FastAPI's /docs page.

The stored check_interval is configuration data only; there is no background scheduler that runs checks automatically. Metrics are derived from simulated outcomes and must not be interpreted as real uptime or service availability.

## Architecture and data flow

    React + TypeScript dashboard
            | HTTP/JSON (Axios; VITE_API_URL)
            v
    FastAPI routers + Pydantic request/response validation
            |
            v
    SQLAlchemy ORM -> SQLite
            |
            +-- endpoint records
            +-- monitoring result history
            +-- incidents

The dashboard uses a single Axios client configured by VITE_API_URL. FastAPI endpoints validate payloads with Pydantic and access persistence through request-scoped SQLAlchemy sessions. backend/app/database.py registers models before creating tables for the local demo.

## Prerequisites

- Python 3.12
- Node.js 22 LTS and npm
- Git
- Docker Engine with Docker Compose (optional)

## Run locally

### One-command Windows startup (PowerShell)

From the repository root, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\dev.ps1
```

The launcher checks for Python 3.12 and Node.js 22 or newer, creates the backend virtual environment when needed, installs missing dependencies, copies example environment files only when a `.env` file does not exist, initializes missing SQLite tables, and starts the backend and frontend in separate PowerShell windows. It waits for the backend's database-aware `/health` response and the frontend's HTTP 200 response before printing the URLs. Existing database files are not deleted, and existing `.env` files are never overwritten. A healthy CloudPulse server already on a required port is reused; a port occupied by another service produces a clear error instead of silently switching ports.

Expected addresses:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health
- API documentation: http://localhost:8000/docs

Keep both server windows open while using the app. Press Ctrl+C in each window to stop its server. The dashboard's top-bar indicator checks the configured backend health endpoint and distinguishes connecting, connected, and unavailable states. If startup fails, read the first error in the server's PowerShell window; a browser's “connection refused” message by itself does not identify which process failed.

### Backend

From the repository root:

**Windows PowerShell**
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
Copy-Item .env.example .env
python -c "from app.database import init_db; init_db()"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**macOS / Linux**
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
python -c "from app.database import init_db; init_db()"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at http://127.0.0.1:8000; interactive docs are at http://127.0.0.1:8000/docs.

### Frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm ci
```

Copy frontend/.env.example to frontend/.env if you need to change the API address. Start Vite:

```bash
npm run dev
```

Open http://localhost:3000. Vite is configured to use port 3000 and fails clearly if that port is occupied instead of silently moving to another port. The API client reads VITE_API_URL; the checked-in example defaults to http://127.0.0.1:8000. Restart Vite after changing frontend/.env.

### Docker Compose demo

From the repository root:

```bash
docker compose up --build
```

The demo publishes the backend at http://127.0.0.1:8000 and the frontend at http://127.0.0.1:3000. Compose initializes the SQLite schema before launching the API and waits for the backend health endpoint before starting the frontend. Ports bind to loopback by default to reduce accidental network exposure; this does not replace authentication or make the application safe for public deployment.

Stop the stack with Ctrl+C, then run docker compose down. To remove the demo database volume too, run docker compose down --volumes.

## Tests and security checks

Dependabot is configured to propose regular updates for npm dependencies in `frontend/` and Python dependencies in `backend/`.

Backend, from backend/:

```bash
python -m pytest tests/ -v
python -m pip_audit
```

Frontend, from frontend/:

```bash
npm ci
npm test -- --run
npm run lint
npm run build
npm run audit:security
```

GitHub Actions runs backend tests and model-schema registration, pip-audit, frontend tests/lint/build, a dedicated frontend npm audit job (`npm run audit:security`), and a Docker Compose smoke test. The frontend manifest and lockfile have been upgraded to remediate the previously reported 14 npm audit findings, and the audit threshold remains high/critical rather than being suppressed. See [the engineering review](ENGINEERING_REVIEW.md) and the latest [Actions runs](https://github.com/Emmy1-tech/CloudPulse/actions) for CI status. A successful build or test run does not by itself establish that the app is production-ready.

### Regression scenario: fresh SQLite test database

From backend/, run python -m pytest tests/ -v. The test fixtures create an isolated in-memory SQLite schema and route each API request to a session bound to that test engine. The tests exercise endpoint creation, simulated check persistence, incident creation, and duplicate-open-incident prevention. They should not depend on a previously initialized local cloudpulse.db.

## API overview

- GET /health — basic API process health response
- /api/endpoints/ — endpoint CRUD
- POST /api/endpoints/{endpoint_id}/check — create a simulated check result; optionally pass ?force_status=success or ?force_status=failure
- GET /api/endpoints/{endpoint_id}/results — monitoring history
- GET /api/endpoints/{endpoint_id}/stats — statistics derived from stored simulated results
- GET /api/endpoints/{endpoint_id}/incidents — incident history
- PUT /api/endpoints/incidents/{incident_id} — acknowledge or resolve an incident

Example request:

```bash
curl -X POST "http://127.0.0.1:8000/api/endpoints/1/check?force_status=failure"
```

The endpoint must already exist. API behavior and schemas can be explored at /docs.

## Known limitations and deployment risks

- **No authentication or authorization.** The API routes are public and list/update/delete operations are not scoped to a verified user. Anyone who can reach the API can read or modify endpoint records.
- **Placeholder secret configuration.** `SECRET_KEY` has a development placeholder default and is not currently used because authentication is not implemented. Never use the placeholder for token signing; require a real secret before adding authentication.
- **Simulated checks only.** The backend does not contact the endpoint URL, validate a real response, or measure real network latency.
- **No scheduled checks.** The interval is stored but no worker currently executes checks on a schedule.
- **SQLite demo persistence.** There are no migration-managed production schema upgrades, backup strategy, or multi-instance database design.
- **Database-aware readiness only.** /health runs SELECT 1 against the configured database and returns 503 when that query fails; it does not verify external target health or a background scheduler.
- **Security audits are time-sensitive.** npm and Python audit results depend on current advisory databases; inspect the latest workflow rather than relying on an old report.
- **CORS is local-origin restricted by default, but is not authentication.** Configure CORS_ORIGINS for the frontend origin you intentionally trust. Debug mode defaults off; enable DEBUG only for local development. Do not expose the API publicly until access control, secrets, logging, rate limits, and deployment settings have been addressed.

## Project structure

```text
backend/
  app/
    api/
    config.py
    database.py
    main.py
    models.py
    schemas.py
  tests/
frontend/
  src/
    components/
    services/
    test/
.github/workflows/ci.yml
docker-compose.yml
```

## Maintainer

**EMMY** — [GitHub repository](https://github.com/Emmy1-tech/CloudPulse)

## License

No license file is currently present in the repository. Unless a license is added, others should not assume the project is licensed for reuse.
