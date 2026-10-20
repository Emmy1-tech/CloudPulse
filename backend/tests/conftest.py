"""Shared pytest fixtures with an isolated in-memory SQLite database."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Alert, Endpoint, Incident, MonitoringResult, User  # register all models

TEST_DATABASE_URL = "sqlite://"


@pytest.fixture(scope="session")
def test_engine():
    """Keep one in-memory SQLite database available across TestClient threads."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(test_engine):
    """Create a clean schema and provide a session for one test."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    testing_session_local = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )
    session = testing_session_local()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def override_database_dependency(db_session, test_engine):
    """Give each API request its own session on the isolated test database."""
    testing_session_local = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )

    def override_get_db():
        session = testing_session_local()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    """Provide a test client; the autouse fixture supplies its test database."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def test_user(db_session):
    """Create a user in the isolated test database."""
    user = User(
        email="test@example.com",
        password_hash="test-only-placeholder-hash",
        name="Test User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_endpoint(db_session, test_user):
    """Create an endpoint in the isolated test database."""
    endpoint = Endpoint(
        user_id=test_user.id,
        name="Test API",
        url="https://api.example.com/health",
        method="GET",
        expected_status=200,
        check_interval=60,
        is_active=True,
    )
    db_session.add(endpoint)
    db_session.commit()
    db_session.refresh(endpoint)
    return endpoint
