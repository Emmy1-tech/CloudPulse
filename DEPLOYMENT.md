# CloudPulse deployment

## Public portfolio website

CloudPulse publishes its **frontend demo** to GitHub Pages at:

https://emmy1-tech.github.io/CloudPulse/

The deployment workflow is `.github/workflows/deploy-pages.yml`. It builds the existing React + TypeScript application and deploys the generated static files whenever a change reaches `main`. You can also run it manually from **GitHub → Actions → Deploy CloudPulse portfolio demo → Run workflow**.

### One-time GitHub setup

1. Open the [CloudPulse repository settings](https://github.com/Emmy1-tech/CloudPulse/settings/pages).
2. Under **Build and deployment**, select **GitHub Actions** as the source if it is not already selected.
3. Open the [Actions tab](https://github.com/Emmy1-tech/CloudPulse/actions) and watch **Deploy CloudPulse portfolio demo**. A green run means the static site was published.
4. Once the deployment completes, open https://emmy1-tech.github.io/CloudPulse/ in a browser.

The workflow runs on pushes to `main`, so merging an approved pull request automatically rebuilds and republishes the site. No hosting API key or repository secret is required.

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
