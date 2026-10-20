# CloudPulse Engineering Review

**Review date:** 2026-10-19  
**Reviewed default branch baseline:** [884fcbf](https://github.com/Emmy1-tech/CloudPulse/commit/884fcbf6cfb90173625fdb9ecc7c44959d5173f5)  
**Working changes:** [PR #2](https://github.com/Emmy1-tech/CloudPulse/pull/2) — intentionally not merged while the frontend dependency audit fails.

## Executive summary

CloudPulse is a useful full-stack learning/demo project, but the baseline was not production-ready. Confirmed issues included an incomplete Docker Compose build path, a Python runtime mismatch, a database initialization gap in the container workflow, frontend API calls that ignored the configured base URL, overly permissive CORS, a process-only health response, and known npm dependency advisories.

The PR addresses the deployment workflow, frontend API client, CORS defaults, database-aware health reporting, and debug-mode defaults. In the latest completed PR-head run [39355438960](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39355438960), GitHub Actions verified 41 backend tests, 5 frontend tests, frontend lint/build, the Python dependency audit, and the Docker Compose smoke test. The frontend dependency audit remains the confirmed blocker; the PR is deliberately not merged.

## Prioritized findings

| Priority | Finding and evidence | Root cause / impact | Status |
|---|---|---|---|
| **P1 — security** | `npm audit` reported 14 vulnerabilities: 6 moderate, 6 high, 2 critical. The report includes direct production dependency `react-router-dom@6.30.6`, direct dev dependencies `vite@5.4.21`, `vitest@1.6.1`, `tailwindcss@3.4.19`, and vulnerable transitive packages. | Locked dependency tree contains advisories. Several full fixes require major upgrades; blind `npm audit fix --force` could break Vite, Tailwind, Vitest, and router configuration. | **Unresolved; CI audit fails.** Keep PR open. |
| **P1 — security** | `backend/app/api/endpoints.py` lists and mutates endpoint records without an authenticated principal or user-scoped queries. The default-user path is hard-coded. | Authentication/authorization are not implemented; any client that can reach the API can access or change records. | **Unresolved by design.** README warns against network exposure; loopback-only Compose binding reduces accidental exposure but is not access control. |
| **P1 — deployment** | Compose specified `build: ./frontend`, but the default branch had no `frontend/Dockerfile`. Backend image used Python 3.14 while CI/documentation used Python 3.12. Compose launched Uvicorn without initializing SQLite tables. | The demo stack could not build the frontend image from the checked-in tree and the API could fail on first database use. | **Fixed in PR #2; Docker smoke job passed on code commit 4711c65.** |
| **P2 — frontend runtime** | `Dashboard.tsx` used hard-coded `http://localhost:8000` URLs for incidents and statistics instead of the Axios client configured by `VITE_API_URL`. | Deployments with a non-default API origin would partially fail even if the main API client worked. | **Fixed in PR #2** and a regression test was added. |
| **P2 — browser boundary** | Baseline CORS used `allow_origins=["*"]` with `allow_credentials=True`. | This is broader than needed for a local demo and makes credential policy unclear. CORS is not authentication. | **Changed and tested in PR #2** on code commit 4711c65: configurable local origins, credentials disabled, explicit methods/headers, and two CORS regression tests. |
| **P2 — readiness semantics** | Baseline `GET /health` always returned `{"status":"healthy"}` without checking database connectivity. | The response could be healthy while database operations were failing. | **Changed in PR #2** to execute `SELECT 1` and return HTTP 503 on SQLAlchemy database errors; regression tests added. |
| **P2 — test confidence** | Existing backend tests use an isolated in-memory SQLite engine, create model tables, and override `get_db` with request-scoped sessions. | This fixed the earlier `no such table` failures in tests, but passing unit/API tests alone does not prove the container starts or dependencies are secure. | **Verified on baseline:** 36 backend tests passed. CI now includes container smoke coverage and the frontend audit. |
| **P3 — product scope** | `backend/app/api/monitoring.py` generates random/specified outcomes and simulated 50–500 ms response times; no outbound request is made. `check_interval` is stored but no scheduler uses it. | Uptime and response-time figures are demo metrics, not real service telemetry. | **Documented, not a defect for a clearly labelled demo.** Real probes and scheduling remain future work. |
| **P3 — schema evolution** | `init_db()` calls SQLAlchemy `create_all`; there are no migrations. | `create_all` creates missing tables but is not a versioned schema migration strategy. | **Unresolved; acceptable for local demo only.** |

## npm audit detail

Evidence: [CI run that emitted the audit report](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39355073046) on the PR branch. The command was `npm audit --json`; it exited non-zero. The lockfile versions below were read from the checked-in lockfile at the time of the audit.

| Package (locked version) | Severity | Dependency path | Advisory / impact | npm remediation suggestion |
|---|---|---|---|---|
| `braces@3.0.3` | High | Transitive dev dependency via `chokidar` / `micromatch` and Tailwind | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): stack-exhaustion denial of service | Tailwind CSS 4.3.3 (major) |
| `chokidar@3.6.0` | High | Transitive dev dependency of Tailwind | Vulnerable through `braces` advisory above | Tailwind CSS 4.3.3 (major) |
| `fast-glob@3.3.3` | High | Transitive dev dependency | npm reports the affected dependency path; no direct advisory detail in the summary object | npm reports a compatible fix available |
| `micromatch@4.0.8` | High | Transitive dev dependency | Vulnerable through the `braces` path | Tailwind CSS 4.3.3 (major) |
| `tailwindcss@3.4.19` | High | Direct dev dependency | Depends on vulnerable transitive packages in this lockfile | Tailwind CSS 4.3.3 (major) |
| `vite@5.4.21` | High overall | Direct dev dependency | Includes [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) and related Vite advisories | Vite 8.3.4 (major) |
| `esbuild@0.21.5` | Moderate | Transitive dev dependency of Vite | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99): website can send requests to and read responses from the dev server | Vite 8.3.4 (major) |
| `postcss-nested@6.2.0` | Moderate | Transitive dev dependency | npm reports the affected dependency path | npm reports a compatible fix available |
| `postcss-selector-parser@6.1.4` | Moderate | Transitive dev dependency of Tailwind | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf): CPU exhaustion from quadratic selector parsing | Tailwind CSS 4.3.3 (major) |
| `react-router-dom@6.30.6` | Moderate | **Direct production dependency** | See React Router advisories below | React Router DOM 7.18.4 (major) |
| `react-router@6.30.6` | Moderate | Transitive production dependency of React Router DOM | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) open redirect; [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) SSR hydration constructor injection | React Router DOM 7.18.4 (major) |
| `vite-node@1.6.1` | Moderate | Transitive dev dependency of Vitest | Vulnerable Vite/Vitest dependency path | Vitest 4.1.12 (major) |
| `vitest@1.6.1` | Critical | Direct dev dependency | [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp): critical arbitrary file read/execute when the Vitest UI server is listening | Vitest 4.1.12 (major) |
| `tinypool@0.8.4` | Critical | Transitive dev dependency of Vitest | [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) and [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr): prototype-pollution gadget leading to RCE | Vitest 4.1.12 (major) |

The audit's counts represent affected dependency nodes/advisories in the lockfile, not 14 separate application-level exploits. The development-only packages primarily affect developer/CI tooling, but still matter because a malicious or compromised development environment can execute code. React Router is in the runtime dependency graph.

**Why this is not patched in this PR:** npm's full-fix suggestions require multiple major-version migrations. This environment can read and modify repository files and run GitHub Actions, but it cannot run a local npm install/audit because outbound GitHub access from the local container is unavailable. No dependency versions or lockfile entries have been guessed or edited manually. The next safe step is a focused dependency-upgrade PR that updates package versions and lockfile using npm, then runs tests, lint, build, and `npm audit` before acceptance.

## Changes in PR #2

- Added `frontend/Dockerfile`, aligned `backend/Dockerfile` with Python 3.12, and added Docker ignore files.
- Updated Compose to initialize SQLite before Uvicorn, bind demo ports to loopback, wait for backend health, and launch the Vite server on the container interface.
- Added a Docker smoke job to CI that validates Compose, builds/starts the stack, and checks that the API and frontend are reachable.
- Routed incident and statistics requests through the configured Axios client rather than hard-coded localhost URLs.
- Made CORS origins configurable, limited defaults to local development origins, disabled credentialed CORS, and added preflight tests.
- Made `/health` execute `SELECT 1` and return 503 on database errors; added success/failure tests.
- Expanded README setup, architecture, regression scenario, and limitations.
- Added an explicit npm audit job. It is intentionally failing while vulnerable dependencies remain.

## Verification evidence

Commands run by GitHub Actions (not on the user's local machine):

- `python -m pytest tests/ -v` — **41 passed in 0.66s** on code commit 4711c65, including two CORS tests, two database-readiness tests, and the safe debug-default test.
- `pip-audit` — **No known vulnerabilities found** in the installed backend dependency set on the recorded CI run.
- `npm test -- --run`, `npm run lint`, `npm run build` — passed on code commit 4711c65.
- `docker compose config --quiet`, `docker compose up --build --detach`, and HTTP checks against `/health` and the frontend — passed on code commit 4711c65; the health endpoint queried SQLite before reporting ready.
- `npm audit --json` — **failed**, 14 findings (6 moderate, 6 high, 2 critical). The current audit job continues to fail intentionally until dependency remediation is verified. See [the latest CI run](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39355438960).

Local reproduction attempt: `git clone https://github.com/Emmy1-tech/CloudPulse.git` failed because the execution container could not resolve `github.com`. I did not claim local test execution; GitHub Actions logs are the source of the test results above.

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

**Verification →** The latest completed PR-head run verified 41 backend tests, 5 frontend tests, lint/build, the Python audit, and the Docker stack. The explicit npm audit exposed 14 vulnerabilities and correctly leaves the PR blocked.

**Trade-offs →** The container still uses SQLite and demo-time `create_all`; local-origin defaults and loopback binding support learning but are not a production deployment design. Major frontend dependency migrations are deferred until the lockfile can be updated and tested safely.

**Remaining work →** Resolve the npm advisories through a dedicated upgrade PR; implement authentication, authorization, and per-user data scoping; use database migrations; implement real bounded-time HTTP probes and scheduled execution; and define production secrets, CORS, logging, rate limits, backup, and deployment policy.

## Five technical interview questions

1. **Why use an in-memory SQLite database with `StaticPool` for API tests?**  
   SQLite's in-memory database exists per connection. `StaticPool` keeps one connection available across the test client and worker threads, so the schema and records are visible to requests. The test fixture creates and drops tables around each test to prevent state leaking between cases.

2. **Why does each API request get its own SQLAlchemy session?**  
   A request-scoped session provides a clear unit-of-work boundary and ensures sessions are closed even when a request raises. Sharing one global session across requests risks cross-request state leakage and unsafe concurrent use.

3. **What does the new `/health` endpoint prove, and what does it not prove?**  
   It executes `SELECT 1`, so a successful response confirms the API process can query its configured database. It does not test external monitored URLs, the correctness of every table/schema, or background scheduling. Those need separate checks.

4. **Why was the dependency audit left failing instead of running `npm audit fix --force`?**  
   The report's proposed fixes include major upgrades to Tailwind, Vite, React Router, and Vitest. A force upgrade can change build tooling and runtime behavior; the right process is to update the manifest and lockfile with npm, review the diff, then run tests, lint, build, and the audit again.

5. **Why restrict CORS and Compose ports if the app still has no authentication?**  
   Binding ports to loopback reduces accidental network exposure, and an explicit CORS allowlist limits which browser origins can read cross-origin responses. Neither prevents direct HTTP clients from calling public API routes. Authentication, authorization, and per-user query scoping are separate required controls before network deployment.
