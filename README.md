# CloudPulse

**CloudPulse** is a local demonstration dashboard for endpoint inventory and incident workflows, maintained by **EMMY**. The project combines a React/TypeScript frontend, a FastAPI API, SQLAlchemy models, and SQLite persistence.

## Public portfolio demo

The interactive frontend is published as a static site at [emmy1-tech.github.io/CloudPulse](https://emmy1-tech.github.io/CloudPulse/) using [GitHub Pages](DEPLOYMENT.md). The hosted build uses clearly labelled sample data stored in each visitor's browser. It does not contact configured endpoint URLs or expose the FastAPI API.

The Pages build and deployment now run after all CI checks pass on pushes to `main`. CI checks also run for pull requests, but the repository currently has no enforcing branch-protection rule requiring a pull request or approval; direct pushes are not blocked by GitHub settings. See [deployment instructions](DEPLOYMENT.md) for the verified setup and current boundaries.

> **Scope warning:** CloudPulse is not production monitoring software. All check outcomes and response times are simulated; no requests are sent to endpoint URLs. Authentication and authorization are not implemented, and API data is not isolated by user. Run the backend locally only; do not expose it to a network or store sensitive data.

## Current features

- Create, view, update, and delete endpoint records.
- Enable or disable endpoints; disabled endpoints cannot be manually checked.
- Search and filter endpoint inventory.
- Trigger simulated success/failure checks for enabled endpoints only.
- Persist check history and calculate on-demand success-rate, uptime-style, and response-time statistics from simulated data.
- Create an incident after a simulated failure, avoid duplicate open incidents in sequential checks, and acknowledge or resolve incidents.
- Browse the REST API at FastAPI's `/docs` page.

The stored `check_interval` is configuration data only; no background scheduler executes checks automatically. Statistics are point-in-time calculations from saved simulated results, not live telemetry.

## Runtime modes

- **Public Pages demo:** `VITE_DEMO_MODE=true` selects the browser-local `demoApi`; sample changes are stored in `cloudpulse-demo-v1` localStorage, with an in-memory fallback when storage is unavailable. No API or monitored URL is contacted.
- **Local API mode:** the frontend makes same-origin `/api` calls through Vite's development proxy. Host development proxies to `http://localhost:8000`; Compose sets the Vite container's target to `http://backend:8000`. The Docker-only hostname is never sent to or resolved by the browser. Set `VITE_API_URL` to a full API origin only when frontend and API are intentionally hosted separately.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data flow, test isolation, and deployment boundaries.

## Prerequisites

- Python 3.12
- Node.js 22.12+ and npm (Vite also supports Node 20.19+; CI and Docker use Node 22)
- Git
- Docker Engine with Docker Compose (optional)

## Run locally

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

The API is available at `http://127.0.0.1:8000`; interactive docs are at `http://127.0.0.1:8000/docs`. `/health` confirms that the API can execute `SELECT 1` against its configured database.

### Frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env   # optional; the same-origin proxy works without this file
npm run dev
```

Use the local URL printed by Vite. By default, the browser calls `/api` on that same origin and Vite forwards it to `http://localhost:8000`. Set `VITE_API_URL` only if using a separately hosted API. For a separate API origin, configure the backend's `CORS_ORIGINS` to include the frontend origin.

### Docker Compose demo

From the repository root:

```bash
docker compose up --build
```

The demo publishes the backend at `http://127.0.0.1:8000` and the frontend at `http://127.0.0.1:3000`. Compose initializes the SQLite schema before launching the API and waits for backend health before starting the frontend. Browser requests go to the frontend's same-origin `/api` path; the Vite process inside the frontend container proxies to the Compose service `backend:8000`. Ports bind to loopback by default to reduce accidental network exposure; this does not replace authentication or make the application safe for public deployment.

This is a **development demo stack**, not a production container setup: Compose mounts source code and runs Uvicorn/Vite in reload/development mode. Stop with Ctrl+C, then run `docker compose down`. To remove the demo database volume too, run `docker compose down --volumes`.

## Tests and security checks

Dependabot proposes regular updates for npm dependencies in `frontend/` and Python dependencies in `backend/`.

Backend, from `backend/`:

```bash
python -m pytest tests/ -v
ruff check app tests
python -m pip_audit
```

Frontend, from `frontend/`:

```bash
npm ci
npm test -- --run
npm run lint
npm run build
npm run audit:security
```

GitHub Actions runs backend tests and Ruff, verifies model-schema registration using a dedicated ignored SQLite path, audits Python and npm dependencies, runs frontend tests/lint and builds both modes, and smoke-tests Compose including the frontend-to-backend API proxy. On `main`, the Pages build/deploy jobs wait for all of those checks. CI does not deploy pull-request builds.

The frontend manifest and lockfile were upgraded to remediate previously reported npm audit findings, and the audit threshold remains high/critical rather than being suppressed. See [the engineering review](ENGINEERING_REVIEW.md) and [GitHub Actions](https://github.com/Emmy1-tech/CloudPulse/actions) for current results. A successful build or test run does not by itself establish that the app is production-ready.

Backend tests use an isolated in-memory SQLite engine and override the FastAPI database dependency. They cover endpoint CRUD, activation, simulated checks, validated pagination, statistics (including a zero response time), and incident workflows without relying on a pre-existing local `cloudpulse.db`.

## API overview

- `GET /health` — API and configured-database readiness (`SELECT 1`)
- `/api/endpoints/` — endpoint CRUD
- `POST /api/endpoints/{endpoint_id}/check` — record a simulated result for an enabled endpoint; `force_status` may be `success` or `failure` (other values return 422)
- `GET /api/endpoints/{endpoint_id}/results` — monitoring history; `limit` is 1–100 and `offset` is 0–10,000
- `GET /api/endpoints/{endpoint_id}/stats` — on-demand statistics from stored simulated results
- `GET /api/endpoints/{endpoint_id}/incidents` — incident history
- `PUT /api/endpoints/incidents/{incident_id}` — acknowledge or resolve an incident

Example request, for an endpoint that already exists:

```bash
curl -X POST "http://127.0.0.1:8000/api/endpoints/1/check?force_status=failure"
```

API schemas and behavior can be explored at `/docs`.

## Known limitations and deployment risks

- **No authentication or authorization.** API routes are reachable without an authenticated principal; reads and mutations are not scoped to a verified user. Anyone who can reach a deployed API could access or change shared records.
- **Placeholder secret configuration.** `SECRET_KEY` has a development placeholder default and is not currently used because authentication is not implemented. Never use the placeholder for token signing; require a real secret before adding authentication.
- **Simulated checks only.** The backend does not contact the endpoint URL, validate a real response, or measure network latency. The public demo and backend use slightly different simulation probabilities; neither is telemetry.
- **No scheduled checks.** The interval is stored but no worker executes checks on a schedule.
- **SQLite demo persistence.** There is no migration-managed production schema upgrade, backup strategy, or multi-instance database design.
- **Database-aware readiness only.** `/health` queries the configured database; it does not verify external targets or a scheduler.
- **Security audits are time-sensitive.** Audit results depend on current advisory databases; inspect the latest workflow rather than relying on an old report.
- **CORS is not authentication.** CORS origins are local-only by default. Configure `CORS_ORIGINS` only for the intended frontend origin; keep debug mode off outside local development.

Do not expose the API publicly until access control, secure secrets, logging, rate limits, persistence/migrations, and deployment controls are addressed.

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
