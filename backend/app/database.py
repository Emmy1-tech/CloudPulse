"""
Database connection and session management.

This file sets up SQLAlchemy to connect to SQLite and manage database sessions.
SQLite is perfect for this project because it's free, requires no setup,
and works great for small to medium-sized applications.

LEARNING EXERCISE:
- Try running the init_db() function to create the database
- Open cloudpulse.db in a SQLite browser to see the tables
- What happens if you call init_db() twice? (SQLAlchemy handles this gracefully)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Create SQLAlchemy engine
# The engine manages the connection to the database
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create SessionLocal class for creating database sessions
# Each session is like a "transaction" - changes are committed or rolled back
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
# All our database models will inherit from this
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.

    This is used in FastAPI endpoints to get a database session.
    The session is automatically closed after the request is done.

    LEARNING EXERCISE:
    - Why do we use 'yield' instead of 'return'? (Try removing 'yield' and see)
    - What happens if we don't close the session? (Memory leaks, connection issues)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize the database by creating all tables.

    This function creates all tables defined in models.py if they don't exist.
    It's safe to run multiple times - SQLAlchemy won't recreate existing tables.

    LEARNING EXERCISE:
    - Run this function and check if cloudpulse.db is created
    - Add a new model in models.py and run this again - what happens?
    """
    from app.models import User, Endpoint, MonitoringResult, Alert
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully!")
