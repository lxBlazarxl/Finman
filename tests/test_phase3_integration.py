import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_spa_serving_and_api_isolation():
    # Root path returns SPA index.html when dist exists, or fallback API message
    root_resp = client.get("/")
    assert root_resp.status_code == 200
    dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    if os.path.isdir(dist_dir):
        assert 'id="root"' in root_resp.text
    else:
        assert root_resp.json().get("message") == "Welcome to FinMan API"

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
