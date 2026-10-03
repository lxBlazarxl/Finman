import pytest
from fastapi.testclient import TestClient

from app.core.database import engine
from app.models.base import Base
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_auth_me_and_household_routes():
    # Register household
    resp = client.post(
        "/api/v1/auth/register-household",
        json={
            "household_name": "Sharma House",
            "admin_name": "Rajesh",
            "phone_number": "9876543210",
            "password": "password123",
        },
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # Test GET /auth/me
    resp_me = client.get("/api/v1/auth/me", headers=admin_headers)
    assert resp_me.status_code == 200
    user_data = resp_me.json()
    assert user_data["name"] == "Rajesh"
    assert user_data["role"] == "ADMIN"
    assert user_data["phone_number"] == "9876543210"

    # Test GET /household
    resp_hh = client.get("/api/v1/household", headers=admin_headers)
    assert resp_hh.status_code == 200
    assert resp_hh.json()["name"] == "Sharma House"

    # Test PATCH /household (admin updates name)
    resp_patch = client.patch(
        "/api/v1/household",
        headers=admin_headers,
        json={"name": "Sharma Family Residence"},
    )
    assert resp_patch.status_code == 200
    assert resp_patch.json()["name"] == "Sharma Family Residence"


def test_account_update_and_delete():
    resp = client.post(
        "/api/v1/auth/register-household",
        json={
            "household_name": "Verma House",
            "admin_name": "Amit",
            "phone_number": "9876543220",
            "password": "password123",
        },
    )
    admin_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # Create account
    resp_acc = client.post(
        "/api/v1/accounts",
        headers=admin_headers,
        json={"name": "HDFC Salary", "type": "BANK", "initial_balance": 5000.0},
    )
    assert resp_acc.status_code == 200
    acc_id = resp_acc.json()["id"]

    # PATCH /accounts/{id}
    resp_patch = client.patch(
        f"/api/v1/accounts/{acc_id}",
        headers=admin_headers,
        json={"name": "HDFC Primary Savings"},
    )
    assert resp_patch.status_code == 200
    assert resp_patch.json()["name"] == "HDFC Primary Savings"

    # DELETE /accounts/{id}
    resp_del = client.delete(f"/api/v1/accounts/{acc_id}", headers=admin_headers)
    assert resp_del.status_code == 200

    # Verify not found
    resp_get = client.get(f"/api/v1/accounts/{acc_id}", headers=admin_headers)
    assert resp_get.status_code == 404


def test_transaction_single_get_patch_and_categories():
    resp = client.post(
        "/api/v1/auth/register-household",
        json={
            "household_name": "Gupta House",
            "admin_name": "Suresh",
            "phone_number": "9876543230",
            "password": "password123",
        },
    )
    admin_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # Get accounts
    accs = client.get("/api/v1/accounts", headers=admin_headers).json()
    cash_id = accs[0]["id"]

    # Deposit income
    client.post(
        "/api/v1/transactions",
        headers=admin_headers,
        json={
            "account_id": cash_id,
            "amount": 2000.0,
            "type": "INCOME",
            "category": "Salary",
            "description": "Cash advance",
        },
    )

    # Create expense transaction
    resp_tx = client.post(
        "/api/v1/transactions",
        headers=admin_headers,
        json={
            "account_id": cash_id,
            "amount": 200.0,
            "type": "EXPENSE",
            "category": "Food & Dining",
            "description": "Dinner",
        },
    )
    assert resp_tx.status_code == 200
    tx_id = resp_tx.json()["id"]

    # Check balance: 2000 - 200 = 1800
    bal1 = client.get("/api/v1/balances/me", headers=admin_headers).json()["total_balance"]
    assert bal1 == 1800.0

    # GET /transactions/{id}
    resp_single = client.get(f"/api/v1/transactions/{tx_id}", headers=admin_headers)
    assert resp_single.status_code == 200
    assert resp_single.json()["description"] == "Dinner"

    # PATCH /transactions/{id} (change amount from 200 to 500, category to Groceries)
    resp_patch = client.patch(
        f"/api/v1/transactions/{tx_id}",
        headers=admin_headers,
        json={"amount": 500.0, "category": "Groceries", "description": "Supermarket"},
    )
    assert resp_patch.status_code == 200
    assert resp_patch.json()["amount"] == 500.0
    assert resp_patch.json()["category"] == "Groceries"

    # Check updated balance: 2000 - 500 = 1500
    bal2 = client.get("/api/v1/balances/me", headers=admin_headers).json()["total_balance"]
    assert bal2 == 1500.0

    # GET /transactions/categories
    resp_cats = client.get("/api/v1/transactions/categories", headers=admin_headers)
    assert resp_cats.status_code == 200
    cats = resp_cats.json()
    assert "Food & Dining" in cats
    assert "Groceries" in cats
    assert "Salary" in cats


def test_member_removal_by_admin():
    resp = client.post(
        "/api/v1/auth/register-household",
        json={
            "household_name": "Patel House",
            "admin_name": "Bhavin",
            "phone_number": "9876543240",
            "password": "password123",
        },
    )
    admin_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # Create member
    resp_m = client.post(
        "/api/v1/household/members",
        headers=admin_headers,
        json={
            "name": "Dev",
            "phone_number": "9876543241",
            "password": "password123",
        },
    )
    assert resp_m.status_code == 200
    member_id = resp_m.json()["id"]

    # Verify member in list
    members = client.get("/api/v1/household/members", headers=admin_headers).json()
    assert len(members) == 2

    # Remove member
    resp_del = client.delete(f"/api/v1/household/members/{member_id}", headers=admin_headers)
    assert resp_del.status_code == 200

    # Verify member removed
    members_after = client.get("/api/v1/household/members", headers=admin_headers).json()
    assert len(members_after) == 1
