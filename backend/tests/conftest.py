"""
Pytest configuration and fixtures.

This file sets up test fixtures that are used across multiple tests.
Fixtures are reusable test components that pytest provides.

LEARNING EXERCISE:
- Try adding a new fixture (e.g., a test endpoint)
- Use the fixture in a test and see how it simplifies your test code
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.models import User, Endpoint, MonitoringResult, Alert

# Use an in-memory SQLite database for testing
# This ensures tests don't interfere with each other or the development database
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    """
    Fixture that provides a database session for testing.

    This fixture:
    1. Creates all tables before the test
    2. Yields a database session
    3. Drops all tables after the test

    LEARNING EXERCISE:
    - What happens if you remove the Base.metadata.drop_all() line?
    - Try creating two tests that use this fixture - do they interfere with each other?
    """
    from app.models import User, Endpoint, MonitoringResult, Alert
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """
    Fixture that provides a test client with test database.

    This overrides the get_db dependency to use the test database.

    LEARNING EXERCISE:
    - Why do we need to override get_db? (Tests shouldn't use the real database)
    - What happens if we don't override it? (Tests would use the development database)
    """
    from app.main import app

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    from fastapi.testclient import TestClient
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """
    Fixture that creates a test user.

    LEARNING EXERCISE:
    - Modify this fixture to create a user with different attributes
    - Use this fixture in a test to verify user creation
    """
    user = User(
        email="test@example.com",
        password_hash="hashed_password_here",
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_endpoint(db_session, test_user):
    """
    Fixture that creates a test endpoint.

    LEARNING EXERCISE:
    - Add a second endpoint to this fixture
    - Use this fixture to test endpoint queries
    """
    endpoint = Endpoint(
        user_id=test_user.id,
        name="Test API",
        url="https://api.example.com/health",
        method="GET",
        expected_status=200,
        check_interval=60,
        is_active=True
    )
    db_session.add(endpoint)
    db_session.commit()
    db_session.refresh(endpoint)
    return endpoint
