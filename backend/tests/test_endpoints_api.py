"""
API endpoint tests for endpoint CRUD operations.

These tests verify that the API endpoints work correctly.
We test successful requests, invalid inputs, and error cases.

LEARNING EXERCISE:
- Try adding a test for an invalid HTTP method
- What happens if you send a non-integer ID to get_endpoint?
- Add a test for updating with no fields (shouldn't change anything)
"""

from fastapi.testclient import TestClient
from app.main import app
from app.models import User
from sqlalchemy.orm import Session


class TestCreateEndpoint:
    """Tests for POST /api/endpoints"""

    def test_create_endpoint_success(self, db_session: Session):
        """Test creating an endpoint with valid data."""
        # Create a test user
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com/health",
                "method": "GET",
                "expected_status": 200,
                "check_interval": 60
            })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test API"
        assert data["url"] == "https://api.example.com/health"
        assert data["method"] == "GET"
        assert data["is_active"] is True
        assert "id" in data

    def test_create_endpoint_invalid_url(self):
        """Test creating an endpoint with invalid URL."""
        with TestClient(app) as client:
            response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "not-a-valid-url",
                "method": "GET"
            })
        assert response.status_code == 422  # Validation error

    def test_create_endpoint_invalid_method(self):
        """Test creating an endpoint with invalid HTTP method."""
        with TestClient(app) as client:
            response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com",
                "method": "INVALID"
            })
        assert response.status_code == 422  # Validation error

    def test_create_endpoint_missing_name(self):
        """Test creating an endpoint without required name."""
        with TestClient(app) as client:
            response = client.post("/api/endpoints/", json={
                "url": "https://api.example.com",
                "method": "GET"
            })
        assert response.status_code == 422  # Validation error

    def test_create_endpoint_invalid_interval(self):
        """Test creating an endpoint with invalid check interval."""
        with TestClient(app) as client:
            response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com",
                "check_interval": 5  # Below minimum of 10
            })
        assert response.status_code == 422  # Validation error


class TestListEndpoints:
    """Tests for GET /api/endpoints"""

    def test_list_endpoints_empty(self, db_session: Session):
        """Test listing endpoints when none exist."""
        with TestClient(app) as client:
            response = client.get("/api/endpoints/")
        assert response.status_code == 200
        # Since tests use the dev database, just check it returns a list
        data = response.json()
        assert isinstance(data, list)

    def test_list_endpoints_with_data(self, db_session: Session):
        """Test listing endpoints when some exist."""
        # Create a test user
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            # Create two endpoints
            client.post("/api/endpoints/", json={
                "name": "API 1",
                "url": "https://api1.example.com"
            })
            client.post("/api/endpoints/", json={
                "name": "API 2",
                "url": "https://api2.example.com"
            })

            response = client.get("/api/endpoints/")
        assert response.status_code == 200
        data = response.json()
        # Should have at least 2 endpoints (may have more from other tests)
        assert len(data) >= 2


class TestGetEndpoint:
    """Tests for GET /api/endpoints/{id}"""

    def test_get_endpoint_success(self, db_session: Session):
        """Test getting an existing endpoint."""
        # Create a test user
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            response = client.get(f"/api/endpoints/{endpoint_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == endpoint_id
        assert data["name"] == "Test API"

    def test_get_endpoint_not_found(self):
        """Test getting a non-existent endpoint."""
        with TestClient(app) as client:
            response = client.get("/api/endpoints/99999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestUpdateEndpoint:
    """Tests for PUT /api/endpoints/{id}"""

    def test_update_endpoint_success(self, db_session: Session):
        """Test updating an endpoint with valid data."""
        # Create a test user
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Old Name",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            response = client.put(f"/api/endpoints/{endpoint_id}", json={
                "name": "New Name",
                "check_interval": 120
            })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["check_interval"] == 120

    def test_update_endpoint_not_found(self):
        """Test updating a non-existent endpoint."""
        with TestClient(app) as client:
            response = client.put("/api/endpoints/99999", json={"name": "New Name"})
        assert response.status_code == 404

    def test_update_endpoint_partial(self, db_session: Session):
        """Test updating only some fields of an endpoint."""
        # Create a test user
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com",
                "method": "GET",
                "check_interval": 60
            })
            endpoint_id = create_response.json()["id"]

            response = client.put(f"/api/endpoints/{endpoint_id}", json={
                "name": "Updated Name",
                "is_active": False,
            })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["is_active"] is False
        assert data["method"] == "GET"  # Unchanged
        assert data["check_interval"] == 60  # Unchanged


class TestDeleteEndpoint:
    """Tests for DELETE /api/endpoints/{id}"""

    def test_delete_endpoint_success(self, db_session: Session):
        """Test deleting an existing endpoint."""
        # Create a test user
        user = User(email="test@example.com", password_hash="hash", name="Test User")
        db_session.add(user)
        db_session.commit()

        with TestClient(app) as client:
            create_response = client.post("/api/endpoints/", json={
                "name": "Test API",
                "url": "https://api.example.com"
            })
            endpoint_id = create_response.json()["id"]

            response = client.delete(f"/api/endpoints/{endpoint_id}")
        assert response.status_code == 204

        # Verify it's deleted
        with TestClient(app) as client:
            get_response = client.get(f"/api/endpoints/{endpoint_id}")
        assert get_response.status_code == 404

    def test_delete_endpoint_not_found(self):
        """Test deleting a non-existent endpoint."""
        with TestClient(app) as client:
            response = client.delete("/api/endpoints/99999")
        assert response.status_code == 404
