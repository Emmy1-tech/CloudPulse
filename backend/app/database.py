"""SQLAlchemy engine, model metadata, and database session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

_engine_options = {}
if settings.database_url.startswith("sqlite"):
    _engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **_engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yield a request-scoped database session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create missing tables after registering every application model."""
    # Importing the model module registers every table, including Incident,
    # with Base.metadata before create_all is called.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
