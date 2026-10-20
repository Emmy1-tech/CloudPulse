"""
FastAPI application entry point.

This is the main file that creates and configures the FastAPI application.
FastAPI is a modern, fast web framework for building APIs with Python.

LEARNING EXERCISE:
- Run this file with 'uvicorn app.main:app --reload'
- Visit http://localhost:8000/docs to see the automatic API documentation
- Add a new endpoint using @app.get decorator and see it appear in /docs
"""

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.api.endpoints import router as endpoints_router
from app.api.monitoring import router as monitoring_router

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="CloudPulse API - Service Monitoring and Incident Management",
    version="0.1.0",
    debug=settings.debug
)

# CORS controls which browser origins can read responses; it is not authentication.
# Keep local development origins as the default and configure deployment origins explicitly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include API routers
app.include_router(endpoints_router)
app.include_router(monitoring_router)


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "message": "CloudPulse API",
        "version": "0.1.0",
        "status": "Phase 1: Foundation - Database setup complete",
        "documentation": "/docs"
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Return healthy only when the API can query its configured database."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc

    return {"status": "healthy", "database": "ok"}


# Note: API endpoints will be added in Phase 2
# We'll create separate files for different endpoint groups (auth, endpoints, monitoring, alerts)
