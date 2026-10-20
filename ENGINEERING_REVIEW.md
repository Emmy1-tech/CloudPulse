# CloudPulse Engineering Review

**Review date:** 2026-10-19  
**Reviewed default branch baseline:** [884fcbf](https://github.com/Emmy1-tech/CloudPulse/commit/884fcbf6cfb90173625fdb9ecc7c44959d5173f5)  
**Working changes:** [PR #2](https://github.com/Emmy1-tech/CloudPulse/pull/2) — frontend dependency remediation is now committed and awaiting CI confirmation.

## Executive summary

CloudPulse is a useful full-stack learning/demo project, but the baseline was not production-ready. Confirmed issues included an incomplete Docker Compose build path, a Python runtime mismatch, a database initialization gap in the container workflow, frontend API calls that ignored the configured base URL, overly permissive CORS, a process-only health response, and known npm dependency advisories.

The PR addresses the deployment workflow, frontend API client, CORS defaults, database-aware health reporting, debug-mode defaults, and a responsive local observability-console redesign. In the latest completed full CI run [39358680517](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39358680517), GitHub Actions verified 41 backend tests, 5 frontend tests, frontend lint/build, the Python dependency audit, and the Docker Compose smoke test. The frontend dependency manifest and lockfile have been upgraded to remove the reported npm advisories; the current PR run is the source of truth for final CI status.

## Prioritized findings

| Priority | Finding and evidence | Root cause / impact | Status |
|---|---|---|---|
| **P1 — security** | The initial frontend lockfile contained 14 npm audit findings, including two critical findings in the Vitest toolchain and high findings in Vite/Tailwind transitive dependencies. | The initial manifest and lockfile pinned an outdated test/build toolchain. The frontend dependencies were upgraded, unused Tailwind/PostCSS and React Router packages were removed, and the lockfile was regenerated with npm. | **Remediated in PR #2; confirm the latest GitHub Actions run before merge.** |
| **P1 — security** | `backend/app/api/endpoints.py` lists and mutates endpoint records without an authenticated principal or user-scoped queries. The default-user path is hard-coded. | Authentication/authorization are not implemented; any client that can reach the API can access or change records. | **Unresolved by design.** README warns against network exposure; loopback-only Compose binding reduces accidental exposure but is not access control. |
| **P1 — deployment** | Compose specified `build: ./frontend`, but the default branch had no `frontend/Dockerfile`. Backend image used Python 3.14 while CI/documentation used Python 3.12. Compose launched Uvicorn without initializing SQLite tables. | The demo stack could not build the frontend image from the checked-in tree and the API could fail on first database use. | **Fixed in PR #2; Docker smoke job passed on code commit 4711c65.** |
| **P2 — frontend runtime** | `Dashboard.tsx` used hard-coded `http://localhost:8000` URLs for incidents and statistics instead of the Axios client configured by `VITE_API_URL`. | Deployments with a non-default API origin would partially fail even if the main API client worked. | **Fixed in PR #2** and a regression test was added. |
| **P2 — browser boundary** | Baseline CORS used `allow_origins=["*"]` with `allow_credentials=True`. | This is broader than needed for a local demo and makes credential policy unclear. CORS is not authentication. | **Changed and tested in PR #2** on code commit 4711c65: configurable local origins, credentials disabled, explicit methods/headers, and two CORS regression tests. |
| **P2 — readiness semantics** | Baseline `GET /health` always returned `{"status":"healthy"}` without checking database connectivity. | The response could be healthy while database operations were failing. | **Changed in PR #2** to execute `SELECT 1` and return HTTP 503 on SQLAlchemy database errors; regression tests added. |
| **P2 — test confidence** | Existing backend tests use an isolated in-memory SQLite engine, create model tables, and override `get_db` with request-scoped sessions. | This fixed the earlier `no such table` failures in tests, but passing unit/API tests alone does not prove the container starts or dependencies are secure. | **Verified on baseline:** 36 backend tests passed. CI now includes container smoke coverage and the frontend audit. |
| **P3 — product scope** | `backend/app/api/monitoring.py` generates random/specified outcomes and simulated 50–500 ms response times; no outbound request is made. `check_interval` is stored but no scheduler uses it. | Uptime and response-time figures are demo metrics, not real service telemetry. | **Documented, not a defect for a clearly labelled demo.** Real probes and scheduling remain future work. |
| **P3 — schema evolution** | `init_db()` calls SQLAlchemy `create_all`; there are no migrations. | `create_all` creates missing tables but is not a versioned schema migration strategy. | **Unresolved; acceptable for local demo only.** |

## Frontend dependency remediation

The initial audit found 14 advisory entries (6 moderate, 6 high, 2 critical). The remediation upgraded Vite to the patched 7.x line and Vitest to 5.x, switched from the SWC-native React plugin to the standard Vite React plugin, and removed unused Tailwind/PostCSS and React Router dependencies. Tailwind was not used for component styling; the app uses its CSS files directly, so removing the unused build pipeline also removed the vulnerable transitive chain. The `frontend/package-lock.json` was regenerated with npm. The security gate remains `npm audit --audit-level=high`; it has not been weakened or changed to ignore findings.

## Changes in PR #2

- Added `frontend/Dockerfile`, aligned `backend/Dockerfile` with Python 3.12, and added Docker ignore files.
- Updated Compose to initialize SQLite before Uvicorn, bind demo ports to loopback, wait for backend health, and launch the Vite server on the container interface.
- Added a Docker smoke job to CI that validates Compose, builds/starts the stack, and checks that the API and frontend are reachable.
- Routed incident and statistics requests through the configured Axios client rather than hard-coded localhost URLs.
- Made CORS origins configurable, limited defaults to local development origins, disabled credentialed CORS, and added preflight tests.
- Made `/health` execute `SELECT 1` and return 503 on database errors; added success/failure tests.
- Expanded README setup, architecture, regression scenario, and limitations.
- Added an explicit frontend npm audit job and `audit:security` script, then upgraded the frontend dependency graph and regenerated the lockfile without lowering the audit threshold.

## Verification evidence

Commands run by GitHub Actions (not on the user's local machine):

- `python -m pytest tests/ -v` — **41 passed in 0.66s** on code commit 4711c65, including two CORS tests, two database-readiness tests, and the safe debug-default test.
- `pip-audit` — **No known vulnerabilities found** in the installed backend dependency set on the recorded CI run.
- `npm test -- --run`, `npm run lint`, `npm run build` — passed on code commit 4711c65.
- `docker compose config --quiet`, `docker compose up --build --detach`, and HTTP checks against `/health` and the frontend — passed on code commit 4711c65; the health endpoint queried SQLite before reporting ready.
- `npm run audit:security` (`npm audit --audit-level=high`) — the updated local dependency tree reports **zero vulnerabilities**. GitHub Actions run [39358680517](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39358680517) completed with all five jobs successful, including the lockfile install and frontend audit. A Dependabot configuration proposes ongoing npm and Python dependency updates.

Local verification in an isolated working copy: `npm ci`, `npm audit --audit-level=high`, `npm test -- --run` (5 passed), `npm run lint`, and `npm run build` all passed. GitHub Actions run [39358680517](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39358680517) also completed all five jobs successfully.

## Architecture decisions and trade-offs

- **Isolated in-memory SQLite in tests:** fast, deterministic test state and no reliance on a developer's local database. A separate session per request better models FastAPI request lifecycle; it is not a substitute for integration testing against a deployed database.
- **Loopback-only Compose ports:** safer default for a demo. It deliberately limits access from other machines but does not implement identity, authorization, or production network policy.
- **Configurable explicit CORS origins:** avoids wildcard origin access and disables credentialed cross-origin requests because authentication is not implemented. CORS must still be configured for a real deployment and is not an authorization boundary.
- **Database-aware health check:** `SELECT 1` detects basic database connectivity and makes Compose readiness more meaningful. It does not prove that external monitored services are healthy or that a future scheduler is running.
- **No forced dependency upgrades:** preserving working build behavior matters; major upgrades need lockfile updates and compatibility tests, not guessed version edits.

## Portfolio case study

**Problem →** CloudPulse's tests were green after an SQLite fixture repair, but that did not prove the documented Docker stack was buildable or that the frontend respected runtime API configuration.

**Investigation →** Reviewed the live tree, Compose configuration, Dockerfiles, API client and dashboard call sites, test fixtures, workflow logs, and current npm audit output.

**Root cause →** The Compose build referenced a missing frontend Dockerfile; the backend image used a different Python major/minor than CI; container startup did not initialize the SQLite schema; two dashboard flows bypassed the shared Axios client; CORS was permissive; and the health endpoint did not query the database.

**Implementation →** Added the missing container build definition and smoke coverage, aligned Python versions, initialized demo schema before startup, routed requests through the configured API client, restricted CORS defaults, and added database-aware readiness with regression tests.

**Verification →** The prior completed run verified 41 backend tests, 5 frontend tests, lint/build, the Python audit, and the Docker stack. After dependency remediation, the local frontend test suite (5 tests), lint, production build, and `npm audit --audit-level=high` all pass; final acceptance depends on the newest GitHub Actions run.

**Trade-offs →** The container still uses SQLite and demo-time `create_all`; local-origin defaults and loopback binding support learning but are not a production deployment design. The frontend toolchain was moved to patched major versions and validated with tests, lint, build, and npm audit.

**Remaining work →** Confirm all GitHub Actions jobs pass; implement authentication, authorization, and per-user data scoping; use database migrations; implement real bounded-time HTTP probes and scheduled execution; and define production secrets, CORS, logging, rate limits, backup, and deployment policy.

## Five technical interview questions

1. **Why use an in-memory SQLite database with `StaticPool` for API tests?**  
   SQLite's in-memory database exists per connection. `StaticPool` keeps one connection available across the test client and worker threads, so the schema and records are visible to requests. The test fixture creates and drops tables around each test to prevent state leaking between cases.

2. **Why does each API request get its own SQLAlchemy session?**  
   A request-scoped session provides a clear unit-of-work boundary and ensures sessions are closed even when a request raises. Sharing one global session across requests risks cross-request state leakage and unsafe concurrent use.

3. **What does the new `/health` endpoint prove, and what does it not prove?**  
   It executes `SELECT 1`, so a successful response confirms the API process can query its configured database. It does not test external monitored URLs, the correctness of every table/schema, or background scheduling. Those need separate checks.

4. **How were the frontend dependency advisories remediated?**  
   The manifest and lockfile were updated with npm, the vulnerable build/test packages were upgraded, and unused Tailwind/PostCSS and React Router dependencies were removed. Tests, lint, production build, and `npm audit --audit-level=high` were rerun rather than lowering the security threshold.

5. **Why restrict CORS and Compose ports if the app still has no authentication?**  
   Binding ports to loopback reduces accidental network exposure, and an explicit CORS allowlist limits which browser origins can read cross-origin responses. Neither prevents direct HTTP clients from calling public API routes. Authentication, authorization, and per-user query scoping are separate required controls before network deployment.
