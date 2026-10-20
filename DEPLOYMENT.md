# CloudPulse deployment

## Public portfolio website

CloudPulse's public website is a **static frontend demo** intended for GitHub Pages:

https://emmy1-tech.github.io/CloudPulse/

The workflow is `.github/workflows/deploy-pages.yml`. After the one-time Pages setup below, it builds the React + TypeScript app and publishes it when changes reach `main`. It can also be run manually from **GitHub → Actions → Deploy CloudPulse portfolio demo → Run workflow**.

### One-time GitHub setup (required)

The workflow intentionally does not try to create or enable the GitHub Pages site through its Actions token. That operation can fail with `Resource not accessible by integration` because the workflow token does not have repository-administration permissions.

1. Open [CloudPulse repository Settings → Pages](https://github.com/Emmy1-tech/CloudPulse/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions** and save if prompted.
3. Open the [Actions tab](https://github.com/Emmy1-tech/CloudPulse/actions).
4. Select **Deploy CloudPulse portfolio demo**, choose **Run workflow** on the `main` branch, and run it.
5. Wait for both the build and deploy jobs to succeed, then open https://emmy1-tech.github.io/CloudPulse/.

A successful CI run alone does not mean the website has been published; the Pages deployment must also succeed. If Pages settings are organization-managed or unavailable, a repository administrator must enable Pages.

## Demo mode and backend safety

The hosted Pages build sets `VITE_DEMO_MODE=true`. It uses sample endpoints and simulated checks stored in the visitor's browser local storage. No outbound health-check requests are sent. All sample metrics and incidents are illustrative; they are not live uptime, latency, or availability measurements. Visitors can add, edit, check, and delete demo endpoints without changing the repository owner's database.

The normal local build continues to use the existing FastAPI API unless `VITE_DEMO_MODE=true` is explicitly set. To run the backend-connected local application, follow the steps in [README.md](README.md).

**The FastAPI backend is intentionally not deployed publicly in this configuration.** The current API has no authentication or authorization and uses simulated monitoring. Exposing it publicly would allow visitors to read or modify shared records. Before making a backend public, add access control, appropriate CORS origins, secure configuration, production database persistence/migrations, and request/rate limiting. The current SQLite demo database also should not be treated as durable storage on ephemeral free hosting.

## Build locally

From the repository root:

```bash
cd frontend
npm ci
npm run build
```

For a local static demo build:

```bash
VITE_DEMO_MODE=true npm run build
```

In Windows PowerShell, use `$env:VITE_DEMO_MODE="true"; npm run build`.
