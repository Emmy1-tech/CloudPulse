# CloudPulse Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudPulse System                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│                        (React + TypeScript)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Dashboard  │  │   Service    │  │   Incident   │         │
│  │   Component  │  │   Forms      │  │   Panel      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                     │
│                    ┌───────▼───────┐                             │
│                    │  API Client   │                             │
│                    │   (Axios)     │                             │
│                    └───────┬───────┘                             │
└────────────────────────────┼─────────────────────────────────────┘
                             │ HTTP/JSON
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                        Backend Layer                              │
│                        (FastAPI + Python)                         │
├────────────────────────────┼─────────────────────────────────────┤
│                    ┌───────▼───────┐                             │
│                    │  API Router   │                             │
│                    └───────┬───────┘                             │
│         ┌──────────────────┼──────────────────┐                  │
│         │                  │                  │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │  Endpoints  │  │  Monitoring │  │  Incidents  │            │
│  │     API     │  │     API     │  │     API     │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼───────┐                             │
│                    │  Pydantic     │                             │
│                    │  Validation   │                             │
│                    └───────┬───────┘                             │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                        Data Layer                                 │
│                        (SQLite + SQLAlchemy)                      │
├────────────────────────────┼─────────────────────────────────────┤
│                    ┌───────▼───────┐                             │
│                    │  SQLAlchemy   │                             │
│                    │     ORM       │                             │
│                    └───────┬───────┘                             │
│         ┌──────────────────┼──────────────────┐                  │
│         │                  │                  │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │    Users    │  │  Endpoints  │  │  Monitoring  │            │
│  │   Table     │  │    Table    │  │   Results    │            │
│  └─────────────┘  └─────────────┘  └──────┬──────┘            │
│                                            │                     │
│                                     ┌──────▼──────┐             │
│                                     │  Incidents  │             │
│                                     │    Table    │             │
│                                     └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘

Data Flow:
1. User interacts with Frontend Dashboard
2. Frontend API Client sends HTTP requests to Backend
3. Backend validates with Pydantic schemas
4. Backend performs CRUD operations via SQLAlchemy ORM
5. Data persisted in SQLite database
6. Response returned as JSON to Frontend
7. Frontend updates UI with new state

Key Features:
- Simulated health checks (80% success rate)
- Deterministic simulation controls (force success/failure)
- Automatic incident creation on failures
- Duplicate incident prevention
- Incident lifecycle (open → acknowledged → resolved)
- Real-time statistics calculation
- In-app alert panel
