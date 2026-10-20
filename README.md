# CloudPulse

**CloudPulse** is a service monitoring and incident management dashboard built as a portfolio project for entry-level software engineering roles.

## 🎯 Project Overview

CloudPulse allows users to:
- Register HTTP endpoints to monitor
- Trigger simulated health checks
- View monitoring history and statistics
- Track incidents when services fail
- Resolve incidents and track uptime

**Tech Stack:**
- **Backend:** Python 3.14, FastAPI, SQLite, Pydantic
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Testing:** pytest (backend)
- **DevOps:** Docker, GitHub Actions

**Budget:** $0 (completely free development and deployment)

## 🚀 Quick Start

### Prerequisites
- Python 3.14+
- Node.js 20+
- npm

### Installation

1. **Clone the repository**
```bash
cd cloudpulse-new
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Git Bash:
source venv/Scripts/activate

pip install -r requirements.txt
pip install -r requirements-dev.txt

cp .env.example .env
python -c "from app.database import init_db; init_db()"
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
```

4. **Run the Application**

**Terminal 1 - Backend:**
```bash
cd backend
source venv/Scripts/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

5. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📖 Features

### Core Functionality
- ✅ Create, read, update, delete monitoring endpoints
- ✅ Trigger manual health checks (simulated)
- ✅ View monitoring history and statistics
- ✅ Automatic incident creation on failures
- ✅ Incident management (acknowledge, resolve)
- ✅ In-app alert panel for active incidents
- ✅ Real-time statistics (success rate, uptime, response time)

### Technical Features
- ✅ RESTful API with FastAPI
- ✅ React + TypeScript frontend
- ✅ SQLite database with SQLAlchemy ORM
- ✅ Pydantic validation
- ✅ Comprehensive test coverage (34 backend tests)
- ✅ Interactive API documentation
- ✅ Docker support
- ✅ GitHub Actions CI/CD

## 🧪 Testing

### Backend Tests
```bash
cd backend
source venv/Scripts/activate
pytest tests/ -v
```

**Test Coverage:** 36/36 tests passing

### Frontend Tests
```bash
cd frontend
npm test -- --run
```

**Test Coverage:** 4/4 tests passing

## 📊 Project Structure

```
cloudpulse-new/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   │   ├── endpoints.py   # Endpoint CRUD
│   │   │   └── monitoring.py  # Monitoring & incidents
│   │   ├── main.py           # FastAPI app
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # Database connection
│   │   ├── models.py         # SQLAlchemy models
│   │   └── schemas.py        # Pydantic schemas
│   ├── tests/
│   │   ├── test_database.py   # Database model tests
│   │   ├── test_endpoints_api.py  # API tests
│   │   └── test_monitoring.py     # Monitoring tests
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.tsx  # Main dashboard
│   │   ├── services/
│   │   │   └── api.ts          # API client
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## ⚠️ Important Notes

### Simulated Monitoring
The health check system is **simulated** for demonstration purposes:
- 80% success rate for demo purposes
- Does not make real HTTP requests to external endpoints
- Clearly labeled as "SIMULATED" in the UI
- In production, this would be replaced with real HTTP requests

### No Authentication
The application currently has **no authentication**:
- All endpoints are publicly accessible
- This is acceptable for a demo/portfolio project
- Would need to be addressed before production deployment
- Password hashing infrastructure is in place for future implementation

### Free and Local
- All functionality is local and free
- No paid services, APIs, or external dependencies
- SQLite database (no database costs)
- In-app alerts only (no email/SMS)

## 🔒 Security

### Implemented
- ✅ Password hashing with bcrypt (ready for future auth)
- ✅ Input validation with Pydantic
- ✅ SQL injection prevention via SQLAlchemy ORM
- ✅ CORS configuration
- ✅ Environment variables for secrets
- ✅ No plaintext passwords stored

### Limitations
- ⚠️ No authentication (documented limitation)
- ⚠️ SQLite (would migrate to PostgreSQL for production)
- ⚠️ No rate limiting
- ⚠️ No HTTPS in development

## 🎓 Learning Opportunities

This project demonstrates:
- Full-stack development (Python + React)
- RESTful API design
- Database modeling and relationships
- Frontend state management
- API integration
- Testing strategies
- Docker containerization
- CI/CD with GitHub Actions

## 📈 Future Improvements

### For Production
- Add JWT authentication
- Implement real HTTP health checks
- Migrate to PostgreSQL
- Add rate limiting
- Implement background job scheduler
- Add comprehensive logging
- Add E2E tests with Playwright

### Features
- User authentication and authorization
- Team collaboration
- Webhook integrations
- Email alerts (with free SMTP service)
- Advanced analytics
- Performance optimization

## 📝 Documentation

- [Implementation Plan](CLOUDPULSE_IMPLEMENTATION_PLAN.md)
- [Phase 1 Report](PHASE1_REPORT.md) - Database setup and models
- [Phase 2 Report](PHASE2_REPORT.md) - API endpoints and validation
- [Phase 3 Report](PHASE3_REPORT.md) - Monitoring, incidents, and frontend
- [Phase 4 Report](PHASE4_REPORT.md) - Final polish and summary

## 🚢 Deployment

### Free Options
- **Render.com** - Free tier for Python/SQLite
- **Railway.app** - Free credits available
- **Vercel + PythonAnywhere** - Free frontend + backend hosting

### Docker
```bash
docker-compose up --build
```

## 📄 License

MIT

## 👨‍💻 Portfolio Context

This project was built as a demonstration of:
- Full-stack development skills
- API design and implementation
- Database modeling
- Frontend-backend integration
- Testing and CI/CD
- Problem-solving and debugging

Perfect for showcasing to potential employers in the software engineering field.
