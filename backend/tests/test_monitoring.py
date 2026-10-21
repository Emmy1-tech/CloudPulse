"""
Monitoring and incident management API tests.

Tests for:
- Manual endpoint checks
- Monitoring results retrieval
- Statistics calculation
- Incident creation and management
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import User, Endpoint, MonitoringResult, Incident
from sqlalchemy.orm import Session


class TestTriggerCheck:
    """Tests for POST /api/endpoints/{id}/check"""

    def test_trigger_check_success(self, db_session: Session):
        """Test triggering a successful check."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Force success for deterministic test
            response = client.post(f"/api/endpoints/{endpoint_id}/check?force_status=success")
        
        assert response.status_code == 200
        data = response.json()
        assert data["endpoint_id"] == endpoint_id
        assert data["status"] == "success"
        assert "response_time" in data
        assert "checked_at" in data

    def test_trigger_check_forced_failure(self, db_session: Session):
        """Test triggering a forced failure."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Force failure for deterministic test
            response = client.post(f"/api/endpoints/{endpoint_id}/check?force_status=failure")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failure"
        assert data["error_message"] is not None

    def test_trigger_check_not_found(self):
        """Test checking a non-existent endpoint."""
        with TestClient(app) as client:
            response = client.post("/api/endpoints/99999/check")
        assert response.status_code == 404


class TestGetMonitoringResults:
    """Tests for GET /api/endpoints/{id}/results"""

    def test_get_results_empty(self, db_session: Session):
        """Test getting results when none exist."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            response = client.get(f"/api/endpoints/{endpoint_id}/results")
        
        assert response.status_code == 200
        assert response.json() == []

    def test_get_results_with_data(self, db_session: Session):
        """Test getting results when some exist."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Trigger a check
            client.post(f"/api/endpoints/{endpoint_id}/check")

            response = client.get(f"/api/endpoints/{endpoint_id}/results")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1


class TestGetStats:
    """Tests for GET /api/endpoints/{id}/stats"""

    def test_get_stats_no_checks(self, db_session: Session):
        """Test getting stats when no checks exist."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            response = client.get(f"/api/endpoints/{endpoint_id}/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_checks"] == 0
        assert data["success_rate"] == 0.0

    def test_get_stats_with_checks(self, db_session: Session):
        """Test getting stats with checks."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Trigger multiple checks
            for _ in range(5):
                client.post(f"/api/endpoints/{endpoint_id}/check")

            response = client.get(f"/api/endpoints/{endpoint_id}/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_checks"] == 5
        assert "success_rate" in data
        assert "uptime_percentage" in data


class TestIncidents:
    """Tests for incident management"""

    def test_incident_created_on_failure(self, db_session: Session):
        """Test that an incident is created when check fails."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Force failure to ensure incident is created
            check_response = client.post(f"/api/endpoints/{endpoint_id}/check?force_status=failure")

            # Check for incidents
            incidents_response = client.get(f"/api/endpoints/{endpoint_id}/incidents")
        
        assert incidents_response.status_code == 200
        incidents = incidents_response.json()
        # Should have at least one incident since we forced a failure
        assert len(incidents) >= 1

    def test_get_incidents_empty(self, db_session: Session):
        """Test getting incidents when none exist."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            response = client.get(f"/api/endpoints/{endpoint_id}/incidents")
        
        assert response.status_code == 200
        assert response.json() == []

    def test_update_incident_status(self, db_session: Session):
        """Test updating incident status."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Manually create an incident
            incident = Incident(endpoint_id=endpoint_id, status="open")
            db_session.add(incident)
            db_session.commit()
            incident_id = incident.id

            # Acknowledge the incident
            response = client.put(f"/api/endpoints/incidents/{incident_id}", json={"status": "acknowledged"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "acknowledged"

    def test_update_incident_invalid_status(self, db_session: Session):
        """Test updating incident with invalid status."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Manually create an incident
            incident = Incident(endpoint_id=endpoint_id, status="open")
            db_session.add(incident)
            db_session.commit()
            incident_id = incident.id

            # Try invalid status - should fail Pydantic validation
            response = client.put(f"/api/endpoints/incidents/{incident_id}", json={"status": "invalid"})
        
        assert response.status_code == 422  # Validation error

    def test_duplicate_incident_prevention(self, db_session: Session):
        """Test that duplicate open incidents are prevented."""
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            # Force failure to create first incident
            client.post(f"/api/endpoints/{endpoint_id}/check?force_status=failure")

            # Get incidents
            incidents_response = client.get(f"/api/endpoints/{endpoint_id}/incidents")
            incidents = incidents_response.json()
            initial_count = len(incidents)

            # Force another failure - should NOT create a new incident
            client.post(f"/api/endpoints/{endpoint_id}/check?force_status=failure")

            # Get incidents again
            incidents_response = client.get(f"/api/endpoints/{endpoint_id}/incidents")
            incidents = incidents_response.json()

            # Should still have same number of incidents (no duplicate)
            assert len(incidents) == initial_count


class TestMonitoringQueryValidation:
    """Reject invalid query parameters instead of silently using demo defaults."""

    def test_trigger_check_rejects_unknown_forced_status(self, db_session: Session):
        with TestClient(app) as client:
            response = client.post("/api/endpoints/1/check?force_status=maybe")
        assert response.status_code == 422

    @pytest.mark.parametrize("query", ["limit=0", "limit=501", "offset=-1"])
    def test_results_reject_invalid_pagination(self, db_session: Session, query: str):
        with TestClient(app) as client:
            response = client.get(f"/api/endpoints/1/results?{query}")
        assert response.status_code == 422
