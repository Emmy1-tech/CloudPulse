# CloudPulse Engineering Review

**Review date:** 2026-10-20 (local time)
**Reviewed default-branch baseline:** [`5183c67`](https://github.com/Emmy1-tech/CloudPulse/commit/5183c67f7c2322de324037553327adaf611b080b)
**Follow-up work:** branch `fix/cloudpulse-reliability`, opened as [PR #28](https://github.com/Emmy1-tech/CloudPulse/pull/28). Local verification and refreshed [PR Actions run 39543518466](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39543518466) completed successfully; the branch has not been merged or deployed.

## Executive summary

CloudPulse is a full-stack learning/demo project with a static portfolio site and a separately runnable local API. The public Pages site is currently live and intentionally uses browser-local sample data; the FastAPI service is not deployed publicly. The backend does not make real health requests, and authentication, ownership checks, scheduled monitoring, and database migrations are not implemented. Do not treat the app as production monitoring software or expose its API to untrusted networks.

The reported Pages error was a **GitHub repository setup issue, not a backend test failure**. On commit `7281717`, Pages had not yet been enabled/configured to build with Actions. The workflow token could not create the site because it lacked repository-administration permission. A repository administrator subsequently configured Pages. Current-main CI run [39542698579](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39542698579) and Pages run [39542698697](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39542698697), both on `5183c67`, completed successfully. The published URL and its assets returned HTTP 200 during this review.

The follow-up branch repairs observable behavior and release controls: inactive endpoints can no longer be checked, API inputs are bounded/validated, zero response-time averages remain zero, Compose browser requests use Vite's same-origin proxy to the Docker backend service, and Ruff is enforced in CI. Current `main` verifies the Pages demo artifact during frontend PR CI, so PRs no longer show the `build-pages` and `deploy-pages` jobs as skipped. This branch additionally gates the separate Pages deployment workflow on successful main CI. The docs and workflow action pins are aligned with this architecture.

## Pages failure and deployment evidence

- [Run 39513063035](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39513063035) failed before Node setup or site build at `Configure GitHub Pages`, with `Not Found - Please verify that the repository has Pages enabled and configured to build using GitHub Actions`. Its token had `pages: write`; that permission does not grant repository-administration rights to create a Pages site.
- The earlier attempt to enable the site from the workflow, [run 39509392240](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39509392240), failed with `Resource not accessible by integration` while trying to create Pages. One-time repository-admin setup was required.
- After the administrator configured Pages to use GitHub Actions, manual deployment [run 39530620076](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39530620076) successfully published commit `7281717`.
- The latest default-branch CI [run 39542698579](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39542698579) and Pages publication [run 39542698697](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39542698697) both succeeded on `5183c67`.
- Runs [39529625403](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39529625403) and [39530572086](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39530572086) were cancelled; they are not successful deployment evidence. The later successful run is the evidence of publication.

The current deployment URL is [https://emmy1-tech.github.io/CloudPulse/](https://emmy1-tech.github.io/CloudPulse/). Pages is enabled, public, HTTPS-enforced, and configured for workflow deployment.

## Findings and disposition

| Finding | Evidence / impact | Disposition |
|---|---|---|
| Pages setup was absent on the target commit | The failure happened at `configure-pages` before build/deploy; workflow token could not create repository settings. | **Resolved externally:** repository Pages settings now use GitHub Actions. Follow-up docs record the correct one-time setup; no attempt is made to grant the workflow token admin rights. |
| PRs showed Pages jobs as skipped and deployment could publish independently of CI | The previous combined workflow conditionally skipped Pages jobs on PRs; the separate deployment workflow triggered directly on main pushes. | **Skipped-status fix already present in main:** PR CI verifies the public-demo build and assets in `frontend-tests`, so there are no Pages jobs to skip. **Additional release gate in this branch:** deployment waits for successful main CI (or explicit main-branch dispatch). PRs do not publish. |
| Docker frontend API URL relied on browser `localhost` | Absolute `http://localhost:8000` requests bypassed Vite's proxy. `backend` is not resolvable from the visitor's browser, while `localhost` inside a container is not the backend service. | **Proposed fix in branch:** blank `VITE_API_URL` uses same-origin `/api`; host Vite proxies to localhost, Compose Vite proxies to `http://backend:8000`. The host-based Vite-to-FastAPI path and CRUD/disable/check behavior were verified locally. Docker itself is unavailable in this sandbox; the branch's Docker CI smoke test now probes `/api/endpoints/` through the proxy. |
| Disabled endpoints could still receive manual checks | UI activation state was only presentation/update data; backend and demo service still created results for disabled endpoints. | **Fixed in branch:** UI buttons are disabled with explanatory text; FastAPI returns 409 and the browser-local demo service refuses the check. Backend and frontend regression tests cover this. |
| Unknown `force_status` values silently became random checks | The backend accepted any string despite documenting only `success` and `failure`. | **Fixed in branch:** query type is constrained; invalid values return 422 without recording a result. |
| Negative history limits could return unbounded data | SQLite treats a negative `LIMIT` as unlimited. History query inputs previously had no validation. | **Fixed in branch:** `limit` is constrained to 1–100 and `offset` to 0–10,000; invalid-bound tests were added. |
| A zero-millisecond average serialized as `null` | The prior code tested truthiness instead of distinguishing `None` from `0.0`. | **Fixed in branch:** zero remains `0.0`; regression test added. |
| Backend lint was not enforced | Ruff was in development requirements but not run by CI; unused imports and a stale assigned value were present. | **Fixed in branch:** those findings were cleaned up and Ruff is a CI step. Current local Ruff check passes. |
| Action references were mutable version tags | Baseline workflows used major tags rather than immutable revisions. | **Fixed in branch:** GitHub-owned Actions are pinned to resolved full commit SHAs with version comments; weekly Dependabot updates are enabled for GitHub Actions. |
| Setup and architecture documents were stale | README said only “Node 20,” architecture overstated real-time stats and one simulation rate, and API-vs-browser data paths were conflated. | **Fixed in branch:** README, architecture, deployment guide, and this review now describe Vite 7's Node minimum, both app modes, simulated behavior, Compose networking, and the current deployment evidence. |

## Current CI and local verification

**Default-branch evidence:**

- `CloudPulse CI` run [39542698579](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39542698579), head `5183c67`: success.
- Pages run [39542698697](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39542698697), head `5183c67`: build, deploy, and live-asset smoke test success.
- Earlier CI run [39513063062](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39513063062), head `7281717`: success with 41 backend tests, frontend tests/lint/build, dependency audits, and Docker smoke. Its paired Pages run failed for the setup reason above; this does not indicate backend CI failure.

**Follow-up branch, verified locally and in refreshed PR Actions run 39543518466:**

- Backend: `pytest` — **49 passed**; `ruff check app tests` — passed; `pip check` — no broken requirements; `pip-audit` — no known vulnerabilities.
- Frontend: Vitest — **13 passed**; ESLint — passed; TypeScript/Vite production builds — passed in API-connected and public-demo modes; `npm audit --audit-level=high` — zero vulnerabilities.
- Vite/API integration: local frontend `/api` requests successfully reached FastAPI; endpoint create and disable succeeded; checking the disabled endpoint returned 409 and created no history.
- GitHub Pages artifact: Actions-mode build emitted `/CloudPulse/assets/...` URLs.
- Workflow validation: `actionlint` passed; updated CI, Compose, and Dependabot YAML parsed successfully.
- **Docker Compose was not run locally** because the sandbox has no Docker CLI. PR CI's `docker-smoke` job passed, including backend health, frontend reachability, and the new Vite-to-backend `/api/endpoints/` proxy check.
- Refreshed PR run [39543518466](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39543518466) passed all five jobs: backend tests/Ruff, both dependency audits, frontend tests/lint/build and demo asset verification, and the Docker Compose API-proxy smoke test. `build-pages` and `deploy-pages` do not appear as skipped statuses; PRs validate the demo through `frontend-tests` and do not publish.
- Black and mypy are installed in `requirements-dev.txt` but are not configured as repository CI gates. Exploratory checks report 10 files Black would reformat and 12 mypy diagnostics; this follow-up does not silently suppress or claim those optional checks pass.

## Remaining production and governance risks

1. **No authentication, authorization, or tenant isolation.** API routes use a demo/default-user model and are not safe for public access.
2. **No real probes or scheduled worker.** Checks and latency are simulated; `check_interval` is stored but unused. The browser demo uses an 88% success probability; the backend simulator uses 80%.
3. **No schema migration system.** `init_db()` uses `create_all`, which does not upgrade existing schemas. SQLite and the Compose volume are demo persistence, not a production database/backup strategy.
4. **Potential concurrent duplicate incidents.** Duplicate prevention is a sequential check-then-insert; no database constraint/upsert or concurrent request test guarantees one incident under races.
5. **Alert support is incomplete.** `Alert` is a model/table and relationship only; there is no alert API or configuration UI.
6. **Repository review enforcement is disabled.** GitHub reported no branch protection and a disabled ruleset. Therefore CI may pass on a PR but does not require PR review/approval or block direct pushes. The code changes do not alter repository governance settings. If required, an owner must enable a ruleset requiring pull requests, approvals, and the exact CI check names.
7. **Security platform coverage is incomplete.** Dependabot version-update PRs and dependency audits exist; repository Dependabot security alerts and default code scanning/CodeQL were reported disabled/not configured. The branch adds GitHub Actions version updates but does not enable repository security-alert or code-scanning settings.
8. **Backend container is development-oriented.** Compose bind-mounts source and runs reload-mode Uvicorn plus the Vite dev server; it is not a production runtime.

## Architecture decisions and trade-offs

- Tests use isolated in-memory SQLite with `StaticPool` and override `get_db`; the schema-init CI step uses a dedicated ignored SQLite file. This prevents tests from intentionally exercising a developer's configured database.
- Same-origin Vite proxying makes local browser requests independent of container DNS; only the Vite process uses the Compose service hostname.
- Pages is appropriate for a free-tier **static** sample demo, not the FastAPI service. Keeping the API private avoids exposing unauthenticated shared records.
- Full-SHA action pins reduce tag-mutation risk; Dependabot is configured to propose reviewed action updates.
- The release gate prioritizes correctness over fastest deploy: main deployment follows successful CI, including tests, lint, audits, the public-demo asset check, and the Compose smoke check.
