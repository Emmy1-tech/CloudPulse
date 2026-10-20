"""
Database model tests.

These tests verify that our database models work correctly.
We test creating, reading, updating, and deleting records.

LEARNING EXERCISE:
- Run these tests with: pytest tests/test_database.py -v
- Add a test for updating a user's email
- What happens if you try to create two users with the same email?
"""

import pytest
from app.models import User, Endpoint, MonitoringResult, Alert
from sqlalchemy.exc import IntegrityError


class TestUserModel:
    """Tests for the User model."""

    def test_create_user(self, db_session):
        """Test creating a user."""
        user = User(
            email="user@example.com",
            password_hash="hashed_password",
            name="John Doe"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.email == "user@example.com"
        assert user.name == "John Doe"
        assert user.password_hash == "hashed_password"

    def test_user_email_unique(self, db_session):
        """Test that user emails must be unique."""
        user1 = User(
            email="duplicate@example.com",
            password_hash="hash1",
            name="User 1"
        )
        user2 = User(
            email="duplicate@example.com",  # Same email
            password_hash="hash2",
            name="User 2"
        )
        db_session.add(user1)
        db_session.commit()

        db_session.add(user2)
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_user_relationship_with_endpoints(self, db_session):
        """Test that a user can have multiple endpoints."""
        user = User(
            email="user@example.com",
            password_hash="hash",
            name="Test User"
        )
        db_session.add(user)
        db_session.commit()

        endpoint1 = Endpoint(
            user_id=user.id,
            name="API 1",
            url="https://api1.example.com"
        )
        endpoint2 = Endpoint(
            user_id=user.id,
            name="API 2",
            url="https://api2.example.com"
        )
        db_session.add(endpoint1)
        db_session.add(endpoint2)
        db_session.commit()

        assert len(user.endpoints) == 2


class TestEndpointModel:
    """Tests for the Endpoint model."""

    def test_create_endpoint(self, db_session, test_user):
        """Test creating an endpoint."""
        endpoint = Endpoint(
            user_id=test_user.id,
            name="Test API",
            url="https://api.example.com/health",
            method="GET",
            expected_status=200,
            check_interval=60
        )
        db_session.add(endpoint)
        db_session.commit()
        db_session.refresh(endpoint)

        assert endpoint.id is not None
        assert endpoint.name == "Test API"
        assert endpoint.url == "https://api.example.com/health"
        assert endpoint.method == "GET"
        assert endpoint.is_active is True

    def test_endpoint_relationship_with_user(self, db_session, test_user):
        """Test that an endpoint belongs to a user."""
        endpoint = Endpoint(
            user_id=test_user.id,
            name="Test API",
            url="https://api.example.com"
        )
        db_session.add(endpoint)
        db_session.commit()

        assert endpoint.user == test_user
        assert endpoint.user_id == test_user.id

    def test_endpoint_cascade_delete(self, db_session, test_user):
        """Test that deleting a user deletes their endpoints."""
        endpoint = Endpoint(
            user_id=test_user.id,
            name="Test API",
            url="https://api.example.com"
        )
        db_session.add(endpoint)
        db_session.commit()

        endpoint_id = endpoint.id
        db_session.delete(test_user)
        db_session.commit()

        # Endpoint should be deleted due to cascade
        deleted_endpoint = db_session.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
        assert deleted_endpoint is None


class TestMonitoringResultModel:
    """Tests for the MonitoringResult model."""

    def test_create_monitoring_result(self, db_session, test_endpoint):
        """Test creating a monitoring result."""
        result = MonitoringResult(
            endpoint_id=test_endpoint.id,
            status="success",
            status_code=200,
            response_time=150.5
        )
        db_session.add(result)
        db_session.commit()
        db_session.refresh(result)

        assert result.id is not None
        assert result.status == "success"
        assert result.status_code == 200
        assert result.response_time == 150.5

    def test_monitoring_result_failure(self, db_session, test_endpoint):
        """Test creating a failed monitoring result."""
        result = MonitoringResult(
            endpoint_id=test_endpoint.id,
            status="failure",
            status_code=500,
            error_message="Internal Server Error"
        )
        db_session.add(result)
        db_session.commit()

        assert result.status == "failure"
        assert result.error_message == "Internal Server Error"


class TestAlertModel:
    """Tests for the Alert model."""

    def test_create_alert(self, db_session, test_endpoint):
        """Test creating an alert."""
        alert = Alert(
            endpoint_id=test_endpoint.id,
            type="in_app",
            config='{"enabled": true}'
        )
        db_session.add(alert)
        db_session.commit()
        db_session.refresh(alert)

        assert alert.id is not None
        assert alert.type == "in_app"
        assert alert.is_active is True

    def test_alert_relationship_with_endpoint(self, db_session, test_endpoint):
        """Test that an alert belongs to an endpoint."""
        alert = Alert(
            endpoint_id=test_endpoint.id,
            type="in_app",
            config='{}'
        )
        db_session.add(alert)
        db_session.commit()

        assert alert.endpoint == test_endpoint
        assert alert.endpoint_id == test_endpoint.id
