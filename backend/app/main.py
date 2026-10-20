"""
FastAPI application entry point.

This is the main file that creates and configures the FastAPI application.
FastAPI is a modern, fast web framework for building APIs with Python.

LEARNING EXERCISE:
- Run this file with 'uvicorn app.main:app --reload'
- Visit http://localhost:8000/docs to see the automatic API documentation
- Add a new endpoint using @app.get decorator and see it appear in /docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.endpoints import router as endpoints_router
from app.api.monitoring import router as monitoring_router

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="CloudPulse API - Service Monitoring and Incident Management",
    version="0.1.0",
    debug=settings.debug
)

# Configure CORS (Cross-Origin Resource Sharing)
# This allows the frontend to make requests to the backend
# For development, we allow all origins. In production, restrict to your frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


# Note: API endpoints will be added in Phase 2
# We'll create separate files for different endpoint groups (auth, endpoints, monitoring, alerts)
