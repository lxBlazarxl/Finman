import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.core.database import engine
from app.models.base import Base
from app.models.enums import TransactionType
from app.schemas.sms import ConfidenceLevel
from app.services.sms_parser import parse_bank_sms
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_sms_parser_icici_expense():
    sms = "Your A/C ending 4512 is debited for INR 450.00 on 05-Oct-26 at SWIGGY. Avl Bal: INR 12,345.00"
    res = parse_bank_sms(sms)
    assert res.confidence == ConfidenceLevel.HIGH
    assert res.amount == 450.0
    assert res.type == TransactionType.EXPENSE
    assert "SWIGGY" in res.merchant.upper()
    assert res.suggested_category == "Food & Dining"
    assert res.detected_balance == 12345.0
    assert res.bank_name == "ICICI"


def test_sms_parser_axis_bank_expense():
    sms = "INR 1,299.00 debited from Axis Bank A/c ending 8812 on 05-Oct-26 towards AMAZON. Available Balance INR 34,500.00"
    res = parse_bank_sms(sms)
    assert res.confidence == ConfidenceLevel.HIGH
    assert res.amount == 1299.0
    assert res.type == TransactionType.EXPENSE
    assert "AMAZON" in res.merchant.upper()
    assert res.suggested_category == "Shopping"
    assert res.detected_balance == 34500.0
    assert res.bank_name == "Axis Bank"


def test_sms_parser_kotak_bank_expense():
    sms = "Rs 250.00 debited from Kotak Bank A/c 9912 to ZOMATO on 05-Oct-26. Bal: Rs 8,760.50"
    res = parse_bank_sms(sms)
    assert res.confidence == ConfidenceLevel.HIGH
    assert res.amount == 250.0
    assert res.type == TransactionType.EXPENSE
    assert "ZOMATO" in res.merchant.upper()
    assert res.suggested_category == "Food & Dining"
    assert res.detected_balance == 8760.5
    assert res.bank_name == "Kotak Bank"


def test_sms_parser_credit_card_alert():
    sms = "Transaction of INR 2,499.00 on your Credit Card ending 1234 at CROMA on 05-Oct-26. Avl limit: 85,000.00"
    res = parse_bank_sms(sms)
    assert res.confidence == ConfidenceLevel.HIGH
    assert res.amount == 2499.0
    assert res.type == TransactionType.EXPENSE
    assert "CROMA" in res.merchant.upper()
    assert res.suggested_category == "Shopping"
    assert res.detected_balance == 85000.0


def test_sms_parser_modern_upi_and_categories():
    sms1 = "Payment of Rs 150.00 to Starbucks was successful via UPI"
    res1 = parse_bank_sms(sms1)
    assert res1.confidence == ConfidenceLevel.HIGH
    assert res1.amount == 150.0
    assert "Starbucks" in res1.merchant
    assert res1.suggested_category == "Food & Dining"

    sms2 = "Paid Rs. 499.00 to NETFLIX via UPI"
    res2 = parse_bank_sms(sms2)
    assert res2.confidence == ConfidenceLevel.HIGH
    assert res2.suggested_category == "Entertainment"

    sms3 = "Rs 2000.00 paid to ZERODHA on 05-Oct-26"
    res3 = parse_bank_sms(sms3)
    assert res3.confidence == ConfidenceLevel.HIGH
    assert res3.suggested_category == "Investment"


def test_transaction_date_default_and_transfer_type():
    # Register household & admin
    r_reg = client.post(
        "/api/v1/auth/register-household",
        json={
            "household_name": "Test Family",
            "admin_name": "Admin User",
            "phone_number": "9000000001",
            "password": "password123",
        },
    )
    assert r_reg.status_code == 200
    token = r_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create account with balance 10000
    r_acc = client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"name": "Primary Bank", "type": "BANK", "initial_balance": 10000.0},
    )
    assert r_acc.status_code == 200
    acc_id = r_acc.json()["id"]

    # 1. Create transaction with NO date specified
    r_tx = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": acc_id,
            "amount": 500.0,
            "type": "EXPENSE",
            "category": "Groceries",
            "description": "Weekly Veggies",
        },
    )
    assert r_tx.status_code == 200
    tx_data = r_tx.json()
    assert tx_data["date"] is not None
    assert tx_data["amount"] == 500.0

    # Verify balance was updated: 10000 - 500 = 9500
    r_bal = client.get("/api/v1/balances/me", headers=headers)
    assert r_bal.json()["total_balance"] == 9500.0

    # 2. Test TRANSFER type
    r_transfer = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": acc_id,
            "amount": 2000.0,
            "type": "TRANSFER",
            "category": "Miscellaneous",
            "description": "ATM Cash Withdrawal",
        },
    )
    assert r_transfer.status_code == 200
    # Transfer debited account: 9500 - 2000 = 7500
    r_bal2 = client.get("/api/v1/balances/me", headers=headers)
    assert r_bal2.json()["total_balance"] == 7500.0


def test_transaction_account_switch_with_balance_adjustment():
    r_reg = client.post(
        "/api/v1/auth/register-household",
        json={
            "household_name": "Switch Family",
            "admin_name": "Switch Admin",
            "phone_number": "9000000002",
            "password": "password123",
        },
    )
    headers = {"Authorization": f"Bearer {r_reg.json()['access_token']}"}

    # Create Account A (Bank) with 5000 and Account B (Cash) with 1000
    acc_a = client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"name": "Bank A", "type": "BANK", "initial_balance": 5000.0},
    ).json()["id"]

    acc_b = client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"name": "Cash B", "type": "CASH", "initial_balance": 1000.0},
    ).json()["id"]

    # Post 500 expense to Account A -> Account A should be 4500, Account B 1000
    tx = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": acc_a,
            "amount": 500.0,
            "type": "EXPENSE",
            "category": "Dining",
        },
    ).json()

    acc_a_bal = client.get(f"/api/v1/accounts/{acc_a}", headers=headers).json()["current_balance"]
    assert acc_a_bal == 4500.0

    # Switch transaction from Account A to Account B!
    r_patch = client.patch(
        f"/api/v1/transactions/{tx['id']}",
        headers=headers,
        json={"account_id": acc_b},
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["account_id"] == acc_b

    # Account A should have reverted: 4500 + 500 = 5000
    # Account B should now have deducted: 1000 - 500 = 500
    acc_a_bal_new = client.get(f"/api/v1/accounts/{acc_a}", headers=headers).json()["current_balance"]
    acc_b_bal_new = client.get(f"/api/v1/accounts/{acc_b}", headers=headers).json()["current_balance"]
    assert acc_a_bal_new == 5000.0
    assert acc_b_bal_new == 500.0


def test_accounts_admin_scope_and_target_user():
    r_reg = client.post(
        "/api/v1/auth/register-household",
        json={
            "household_name": "Multi Household",
            "admin_name": "Father",
            "phone_number": "9000000003",
            "password": "password123",
        },
    )
    admin_headers = {"Authorization": f"Bearer {r_reg.json()['access_token']}"}

    # Add member
    r_m = client.post(
        "/api/v1/household/members",
        headers=admin_headers,
        json={
            "name": "Son",
            "phone_number": "9000000004",
            "password": "password123",
            "initial_account_name": "Son Wallet",
        },
    )
    son_id = r_m.json()["id"]

    # Member login
    son_token = client.post(
        "/api/v1/auth/login",
        json={"phone_number": "9000000004", "password": "password123"},
    ).json()["access_token"]
    son_headers = {"Authorization": f"Bearer {son_token}"}

    # Admin query with scope=household returns both admin and son accounts
    hh_accs = client.get("/api/v1/accounts?scope=household", headers=admin_headers).json()
    assert len(hh_accs) >= 2

    # Admin query for target_user_id=son_id returns son's account
    son_accs = client.get(f"/api/v1/accounts?target_user_id={son_id}", headers=admin_headers).json()
    assert len(son_accs) == 1
    assert son_accs[0]["name"] == "Son Wallet"

    # Member trying to access household scope is restricted to personal accounts
    mem_accs = client.get("/api/v1/accounts?scope=household", headers=son_headers).json()
    assert len(mem_accs) == 1
    assert mem_accs[0]["user_id"] == son_id
