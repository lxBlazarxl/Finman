from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_spa_serving_and_api_isolation():
    # Root path returns SPA index.html
    root_resp = client.get("/")
    assert root_resp.status_code == 200
    assert 'id="root"' in root_resp.text

    # System routes remain intact
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"

    docs_resp = client.get("/docs")
    assert docs_resp.status_code == 200

    # Non-existent API route returns JSON 404, not HTML
    api_404 = client.get("/api/v1/non_existent_route")
    assert api_404.status_code == 404
    assert api_404.headers["content-type"].startswith("application/json")
