"""
Database models using SQLAlchemy ORM.

These models define the structure of our database tables.
SQLAlchemy ORM allows us to work with database tables as Python classes,
which is much more intuitive than writing raw SQL.

LEARNING EXERCISE:
- Add a new field to the User model (e.g., 'company')
- Run init_db() and see how the database schema changes
- Try creating a User object in Python and saving it to the database
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model for authentication and account management."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship: One user can have many endpoints
    # When a user is deleted, all their endpoints are also deleted (cascade)
    endpoints = relationship("Endpoint", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class Endpoint(Base):
    """Endpoint model for storing HTTP endpoints to monitor."""

    __tablename__ = "endpoints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    method = Column(String, default="GET")
    headers = Column(Text, nullable=True)  # JSON string
    body = Column(Text, nullable=True)     # JSON string
    expected_status = Column(Integer, default=200)
    check_interval = Column(Integer, default=60)  # seconds
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="endpoints")
    monitoring_results = relationship("MonitoringResult", back_populates="endpoint", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="endpoint", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="endpoint", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Endpoint(id={self.id}, name={self.name}, url={self.url})>"


class MonitoringResult(Base):
    """MonitoringResult model for storing endpoint check results."""

    __tablename__ = "monitoring_results"

    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id"), nullable=False)
    status = Column(String, nullable=False)  # 'success' or 'failure'
    status_code = Column(Integer, nullable=True)
    response_time = Column(Float, nullable=True)  # milliseconds
    error_message = Column(Text, nullable=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    endpoint = relationship("Endpoint", back_populates="monitoring_results")

    def __repr__(self):
        return f"<MonitoringResult(id={self.id}, status={self.status}, endpoint_id={self.endpoint_id})>"


class Alert(Base):
    """Alert model for storing alert configurations."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id"), nullable=False)
    type = Column(String, nullable=False)  # 'in_app' for now (no email/SMS to avoid paid services)
    config = Column(Text, nullable=False)  # JSON string with alert configuration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    endpoint = relationship("Endpoint", back_populates="alerts")

    def __repr__(self):
        return f"<Alert(id={self.id}, type={self.type}, endpoint_id={self.endpoint_id})>"


class Incident(Base):
    """Incident model for tracking service outages."""

    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id"), nullable=False)
    status = Column(String, nullable=False, default='open')  # 'open', 'acknowledged', 'resolved'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    endpoint = relationship("Endpoint", back_populates="incidents")

    def __repr__(self):
        return f"<Incident(id={self.id}, status={self.status}, endpoint_id={self.endpoint_id})>"
