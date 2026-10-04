import os
import sys
from datetime import datetime
from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.core.security import get_password_hash
from app.models.household import Household
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.enums import UserRole, AccountType, TransactionType

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded with accounts
        admin = db.query(User).filter(User.phone_number == "9876543210").first()
        if admin:
            # Clear existing transactions and accounts to ensure clean state
            db.query(Transaction).delete()
            db.query(Account).delete()
            db.commit()

            household = db.query(Household).filter(Household.id == admin.household_id).first()
            household.name = "Sharma Family"
            pooja = db.query(User).filter(User.phone_number == "9876543211").first()
        else:
            db.query(Transaction).delete()
            db.query(Account).delete()
            db.query(User).delete()
            db.query(Household).delete()
            db.commit()

            household = Household(name="Sharma Family")
            db.add(household)
            db.commit()
            db.refresh(household)

            admin = User(
                household_id=household.id,
                name="Rajesh Sharma",
                phone_number="9876543210",
                password_hash=get_password_hash("password123"),
                role=UserRole.ADMIN,
            )
            pooja = User(
                household_id=household.id,
                name="Pooja Sharma",
                phone_number="9876543211",
                password_hash=get_password_hash("password123"),
                role=UserRole.MEMBER,
            )
            db.add_all([admin, pooja])
            db.commit()
            db.refresh(admin)
            db.refresh(pooja)

        # Create Rajesh accounts
        hdfc = Account(user_id=admin.id, name="HDFC Salary Account", type=AccountType.BANK, current_balance=125000.0)
        sbi = Account(user_id=admin.id, name="SBI Savings Account", type=AccountType.BANK, current_balance=42500.0)
        cash = Account(user_id=admin.id, name="Cash Wallet", type=AccountType.CASH, current_balance=4500.0)
        icici_cc = Account(user_id=admin.id, name="ICICI Coral Credit Card", type=AccountType.CREDIT_CARD, current_balance=-12450.0)
        
        # Create Pooja accounts
        axis = Account(user_id=pooja.id, name="Axis Bank Account", type=AccountType.BANK, current_balance=58000.0)
        pocket_cash = Account(user_id=pooja.id, name="Pocket Cash", type=AccountType.CASH, current_balance=2800.0)

        db.add_all([hdfc, sbi, cash, icici_cc, axis, pocket_cash])
        db.commit()
        db.refresh(hdfc)
        db.refresh(sbi)
        db.refresh(cash)
        db.refresh(icici_cc)
        db.refresh(axis)
        db.refresh(pocket_cash)

        # Add sample transactions for October 2026
        now = datetime(2026, 10, 2, 10, 30)
        txs = [
            Transaction(user_id=admin.id, account_id=hdfc.id, amount=125000.0, type=TransactionType.INCOME, category="Salary", description="Monthly Salary - October", date=datetime(2026, 10, 1, 9, 0)),
            Transaction(user_id=admin.id, account_id=hdfc.id, amount=32000.0, type=TransactionType.EXPENSE, category="Housing", description="Apartment Rent", date=datetime(2026, 10, 1, 14, 0)),
            Transaction(user_id=admin.id, account_id=sbi.id, amount=6850.0, type=TransactionType.EXPENSE, category="Groceries", description="DMart Monthly Supplies", date=datetime(2026, 10, 2, 16, 20)),
            Transaction(user_id=admin.id, account_id=sbi.id, amount=2340.0, type=TransactionType.EXPENSE, category="Utilities", description="BESCOM Electricity Bill", date=datetime(2026, 10, 2, 18, 0)),
            Transaction(user_id=admin.id, account_id=icici_cc.id, amount=2500.0, type=TransactionType.EXPENSE, category="Transport", description="Shell Petrol Pump", date=datetime(2026, 10, 2, 20, 15)),
            Transaction(user_id=admin.id, account_id=icici_cc.id, amount=680.0, type=TransactionType.EXPENSE, category="Food & Dining", description="Swiggy Dinner Order", date=datetime(2026, 10, 2, 21, 30)),
            Transaction(user_id=admin.id, account_id=cash.id, amount=20.0, type=TransactionType.EXPENSE, category="Food & Dining", description="Morning Chai", date=datetime(2026, 10, 3, 8, 30)),
            Transaction(user_id=admin.id, account_id=cash.id, amount=80.0, type=TransactionType.EXPENSE, category="Transport", description="Auto Fare Metro to Office", date=datetime(2026, 10, 3, 9, 15)),
            Transaction(user_id=pooja.id, account_id=axis.id, amount=30000.0, type=TransactionType.INCOME, category="Freelance", description="UI/UX Client Retainer", date=datetime(2026, 10, 1, 11, 0)),
            Transaction(user_id=pooja.id, account_id=axis.id, amount=3200.0, type=TransactionType.EXPENSE, category="Groceries", description="Nature Basket Organic Store", date=datetime(2026, 10, 2, 15, 45)),
            Transaction(user_id=pooja.id, account_id=axis.id, amount=950.0, type=TransactionType.EXPENSE, category="Entertainment", description="BookMyShow Movie Tickets", date=datetime(2026, 10, 2, 19, 0)),
        ]
        db.add_all(txs)
        db.commit()
        print("Database successfully seeded with realistic Indian household data.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
