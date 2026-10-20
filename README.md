# CloudPulse

**CloudPulse** is a full-stack service-monitoring and incident-management dashboard maintained by **EMMY**.

It provides a local demonstration environment for registering endpoints, running simulated health checks, reviewing monitoring history, and managing incidents.

## Features

- Create, view, update, and delete monitored endpoints.
- Trigger simulated health checks and store results in SQLite.
- Review success rates, uptime estimates, response times, and check history.
- Create incidents when simulated checks fail and prevent duplicate open incidents.
- Acknowledge and resolve incidents.
- View monitoring and incident information in a React dashboard.
- Explore the REST API through FastAPI's interactive documentation.

> **Monitoring is simulated.** The application does not make real health-check requests to the configured external URLs. Do not use its metrics as production monitoring data.

## Technology stack

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy, SQLite, Pydantic
- **Frontend:** React, TypeScript, Vite
- **Tests:** pytest, Vitest
- **CI:** GitHub Actions
- **Optional container workflow:** Docker and Docker Compose

## Prerequisites

- Python 3.12 or newer within the supported dependency range
- Node.js 20 and npm
- Git

## Run locally

Open two terminals from the repository root.

### 1. Set up the backend

**Windows PowerShell:**

```powershell
cd backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
Copy-Item .env.example .env
python -c "from app.database import init_db; init_db()"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**macOS / Linux:**

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
python -c "from app.database import init_db; init_db()"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend API is available at `http://127.0.0.1:8000`; interactive API documentation is at `http://127.0.0.1:8000/docs`.

### 2. Set up the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
```

If `frontend/.env.example` exists, copy it to `.env` and follow its documented settings. Then start the development server:

```bash
npm run dev
```

Use the local URL printed by Vite in the terminal.

## Tests and checks

### Backend

From the repository root:

```bash
cd backend
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests/ -v
python -m pip_audit
```

The test suite uses an isolated in-memory SQLite database. Tests create their schema automatically and should not require a manually initialized local database.

### Frontend

From the repository root:

```bash
cd frontend
npm ci
npm test -- --run
npm run lint
npm run build
```

## API overview

The API is documented interactively at `/docs` while the backend is running. Main routes include:

- `/health` — backend health check
- `/api/endpoints/` — endpoint CRUD
- `/api/endpoints/{endpoint_id}/check` — run a simulated check
- `/api/endpoints/{endpoint_id}/results` — retrieve monitoring history
- `/api/endpoints/{endpoint_id}/stats` — retrieve statistics
- `/api/endpoints/{endpoint_id}/incidents` — retrieve incidents
- `/api/endpoints/incidents/{incident_id}` — update an incident

## Security and limitations

- The current demo does **not** implement user authentication or authorization. Do not expose it publicly or use it to store sensitive data.
- Monitoring is simulated and is intended for demonstration and learning.
- SQLite is used for local development.
- Configure a strong secret through environment variables before extending or deploying the application.
- No paid monitoring, messaging, or external API service is required for the local demo.

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
.github/
  workflows/
    ci.yml
```

## Maintainer

**EMMY**

Repository: [Emmy1-tech/CloudPulse](https://github.com/Emmy1-tech/CloudPulse)

## License

See the repository's license file for license terms.
