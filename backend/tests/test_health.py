"""Readiness endpoint tests for the API's database dependency."""

from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.main import app


def test_health_checks_database_connection(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "ok"}


def test_health_reports_unavailable_database(client):
    class UnavailableSession:
        def execute(self, statement):
            raise SQLAlchemyError("database unavailable")

    def unavailable_db():
        yield UnavailableSession()

    app.dependency_overrides[get_db] = unavailable_db
    try:
        response = client.get("/health")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    assert response.json()["detail"] == "Database unavailable"
