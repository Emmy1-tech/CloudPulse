# CloudPulse deployment

## Public portfolio website

The free-tier public site is a **static frontend demo** on GitHub Pages:

[https://emmy1-tech.github.io/CloudPulse/](https://emmy1-tech.github.io/CloudPulse/)

The repository's Pages site is configured to build with GitHub Actions, is public with HTTPS enforcement, and the current published URL returned HTTP 200. The latest successful Pages run at this review was [run 39536224114](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39536224114), which deployed main commit `c0061b7`.

### Build and deployment workflow

Pages deployment is part of [`.github/workflows/ci.yml`](.github/workflows/ci.yml). On pushes to `main`, the Pages build and deploy jobs run only after backend tests and Ruff, Python and npm dependency audits, frontend tests/lint/builds, and the Docker Compose smoke test all pass. Pull requests run those checks but do not publish. A manual `workflow_dispatch` from `main` follows the same checks before publishing; dispatches from other branches do not publish.

GitHub Pages was initially missing/not configured for Actions. The first failure, [run 39513063035](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39513063035), stopped at `Configure GitHub Pages` with a 404 before build or deploy. An earlier attempt to create the site with the workflow token failed because that token lacked repository-administration permission ([run 39509392240](https://github.com/Emmy1-tech/CloudPulse/actions/runs/39509392240)). The one-time setup has since been completed and the successful deployment above verifies it. If the Pages site is disabled again, a repository administrator must use [Settings → Pages](https://github.com/Emmy1-tech/CloudPulse/settings/pages) and set **Source** to **GitHub Actions**; the workflow token should not be used to create the site.

The `main` branch currently has no enforcing protection/ruleset requiring pull requests, approvals, or CI checks. CI-gated deployment prevents a failed check run from publishing, but it does **not** enforce human review or prevent a direct push. Configure branch protection separately if those controls are required.

## Demo mode and backend safety

The Pages build sets `VITE_DEMO_MODE=true`. It uses sample endpoints and simulated checks stored in each visitor's browser local storage. No outbound health-check requests are sent. Metrics and incidents are illustrative, not live uptime, latency, or availability measurements. Visitors can add, edit, check, enable/disable, and delete sample endpoints without changing the repository owner's database.

The FastAPI backend is **not deployed publicly** in this configuration. Local API mode also simulates checks; it does not contact configured endpoint URLs. The backend has no authentication or authorization and does not scope records by user. Exposing it publicly would allow visitors to read or modify shared records. Before any public backend deployment, implement access control, secure configuration, production database persistence and migrations, and request/rate limiting. SQLite on ephemeral free hosting should not be treated as durable storage.

## Local builds

From the repository root:

```bash
cd frontend
npm ci
npm run build
```

For the browser-local portfolio demo:

```bash
VITE_DEMO_MODE=true npm run build
```

The local API mode defaults to same-origin `/api` requests. Vite proxies those to `http://localhost:8000` when run on the host; Docker Compose sets the proxy target to `http://backend:8000` inside the Compose network. To connect a separately hosted API, set `VITE_API_URL` to its intentional origin and configure matching CORS origins. Do not point a public browser build at `localhost:8000`.

For PowerShell, use `$env:VITE_DEMO_MODE="true"; npm run build`.
