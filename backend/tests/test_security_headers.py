"""CORS policy regression tests."""

def test_cors_allows_configured_local_frontend_origin(client):
    response = client.options(
        "/api/endpoints/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_rejects_unconfigured_origin(client):
    response = client.options(
        "/api/endpoints/",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
