"""
SmokeShield API Integration Tests
Run with: python -m pytest tests/ -v
"""
import pytest
import uuid
from fastapi.testclient import TestClient

# Add parent to path so app can be found
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use a fresh in-memory SQLite database for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_smokeshield.db"
os.environ["SECRET_KEY"] = "TEST_SECRET_KEY"
os.environ["GEMINI_API_KEY"] = ""  # Disable AI calls in tests

from app.main import app
from app.database import engine, Base

# Rebuild tables on a fresh test database
Base.metadata.create_all(bind=engine)

client = TestClient(app)

# ------ Helpers ------
def register_and_login():
    client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "TestPass123"
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123"
    })
    return resp.json()["access_token"]

# ------ Auth Tests ------
def test_health_check():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_register_user():
    unique_email = f"{uuid.uuid4()}@example.com"
    resp = client.post("/api/v1/auth/register", json={
        "full_name": "Subhechha Maiti",
        "email": unique_email,
        "password": "SecurePass@1"
    })
    assert resp.status_code == 201
    assert "user_id" in resp.json()


def test_duplicate_email_rejected():
    client.post("/api/v1/auth/register", json={
        "full_name": "Dup User",
        "email": "dup@example.com",
        "password": "DupPass@1"
    })
    resp = client.post("/api/v1/auth/register", json={
        "full_name": "Dup User 2",
        "email": "dup@example.com",
        "password": "DupPass@2"
    })
    assert resp.status_code == 409


def test_login_valid():
    token = register_and_login()
    assert isinstance(token, str) and len(token) > 20


def test_login_invalid_password():
    resp = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPassword"
    })
    assert resp.status_code == 401


# ------ Profile Tests ------
def test_get_profile_authenticated():
    token = register_and_login()
    resp = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


def test_create_smoking_profile():
    token = register_and_login()
    resp = client.post("/api/v1/users/smoking-profile", headers={"Authorization": f"Bearer {token}"}, json={
        "cigarettes_per_day": 10,
        "years_smoking": 3,
        "previous_quit_attempts": 2,
        "previous_relapses": 1,
        "average_cigarette_cost": 15.0,
        "common_triggers": ["stress", "coffee"]
    })
    # 201 created or 409 if already exists
    assert resp.status_code in (201, 409)


# ------ Craving Tests ------
def test_log_craving():
    token = register_and_login()
    resp = client.post("/api/v1/cravings", headers={"Authorization": f"Bearer {token}"}, json={
        "craving_level": 8,
        "stress_level": 7,
        "trigger": "stress"
    })
    assert resp.status_code == 201
    assert "craving_id" in resp.json()


def test_craving_validation_out_of_range():
    token = register_and_login()
    resp = client.post("/api/v1/cravings", headers={"Authorization": f"Bearer {token}"}, json={
        "craving_level": 15  # Out of range, should fail
    })
    assert resp.status_code == 422


# ------ Check-in Tests ------
def test_submit_checkin():
    token = register_and_login()
    resp = client.post("/api/v1/checkins", headers={"Authorization": f"Bearer {token}"}, json={
        "stress_level": 5,
        "mood_level": 6,
        "craving_level": 4,
        "sleep_hours": 7,
        "smoked_today": False
    })
    assert resp.status_code == 201
    assert "checkin_id" in resp.json()


# ------ Prediction Tests ------
def test_relapse_prediction():
    token = register_and_login()
    resp = client.post("/api/v1/predictions/relapse", headers={"Authorization": f"Bearer {token}"}, json={
        "craving_level": 8,
        "stress_level": 9,
        "smoke_free_days": 6,
        "previous_relapses": 2,
        "cigarettes_per_day": 10,
        "hour": 19,
        "trigger": "stress"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "risk_score" in data
    assert data["risk_level"] in ("LOW", "MEDIUM", "HIGH")
    assert 0 <= data["risk_score"] <= 100


# ------ Recovery Tests ------
def test_recovery_progress():
    token = register_and_login()
    resp = client.get("/api/v1/recovery/progress", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "smoke_free_days" in resp.json()


# ------ Intervention Tests ------
def test_list_interventions():
    resp = client.get("/api/v1/interventions")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


def test_unauthorized_access():
    """Attempting to access protected routes without a token should return 403/401."""
    resp = client.get("/api/v1/users/me")
    assert resp.status_code in (401, 403)  # FastAPI HTTPBearer returns 403 in strict mode, 401 otherwise
