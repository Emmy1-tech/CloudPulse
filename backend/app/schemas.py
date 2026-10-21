"""
Pydantic schemas for request/response validation.

Pydantic schemas define the shape of data for API requests and responses.
They automatically validate incoming data and convert it to Python types.
This helps prevent invalid data from entering our application.

LEARNING EXERCISE:
- Try sending invalid data to an endpoint (e.g., email without @)
- What error message do you get? (Pydantic provides detailed validation errors)
- Add a new field to a schema and see how it affects the API documentation
"""

from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional
from datetime import datetime


# ==================== User Schemas ====================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserResponse(UserBase):
    """Schema for user response (excludes password)."""
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}  # Allows creating from ORM models


# ==================== Endpoint Schemas ====================

class EndpointBase(BaseModel):
    """Base endpoint schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100)
    url: HttpUrl
    method: str = Field(default="GET", pattern="^(GET|POST|PUT|DELETE|PATCH)$")
    headers: Optional[str] = None  # JSON string
    body: Optional[str] = None     # JSON string
    expected_status: int = Field(default=200, ge=100, le=599)
    check_interval: int = Field(default=60, ge=10, le=3600)


class EndpointCreate(EndpointBase):
    """Schema for creating an endpoint."""
    pass


class EndpointUpdate(BaseModel):
    """Schema for updating an endpoint (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[HttpUrl] = None
    method: Optional[str] = Field(None, pattern="^(GET|POST|PUT|DELETE|PATCH)$")
    headers: Optional[str] = None
    body: Optional[str] = None
    expected_status: Optional[int] = Field(None, ge=100, le=599)
    check_interval: Optional[int] = Field(None, ge=10, le=3600)
    is_active: Optional[bool] = None


class EndpointResponse(EndpointBase):
    """Schema for endpoint response."""
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ==================== Monitoring Result Schemas ====================

class MonitoringResultBase(BaseModel):
    """Base monitoring result schema."""
    status: str = Field(..., pattern="^(success|failure)$")
    status_code: Optional[int] = None
    response_time: Optional[float] = None
    error_message: Optional[str] = None


class MonitoringResultCreate(MonitoringResultBase):
    """Schema for creating a monitoring result."""
    endpoint_id: int


class MonitoringResultResponse(MonitoringResultBase):
    """Schema for monitoring result response."""
    id: int
    endpoint_id: int
    checked_at: datetime

    model_config = {"from_attributes": True}


# ==================== Alert Schemas ====================

class AlertBase(BaseModel):
    """Base alert schema."""
    type: str = Field(..., pattern="^(in_app)$")  # Only in_app for now (no paid services)
    config: str  # JSON string with alert configuration


class AlertCreate(AlertBase):
    """Schema for creating an alert."""
    endpoint_id: int


class AlertUpdate(BaseModel):
    """Schema for updating an alert."""
    is_active: Optional[bool] = None
    config: Optional[str] = None


class AlertResponse(AlertBase):
    """Schema for alert response."""
    id: int
    endpoint_id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ==================== Statistics Schema ====================

class EndpointStats(BaseModel):
    """Schema for endpoint statistics."""
    total_checks: int
    success_count: int
    failure_count: int
    success_rate: float
    avg_response_time: Optional[float]
    uptime_percentage: float


class IncidentUpdate(BaseModel):
    """Schema for updating incident status."""
    status: str = Field(..., pattern="^(acknowledged|resolved)$")
