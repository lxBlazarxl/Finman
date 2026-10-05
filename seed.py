import os
import sys
from datetime import datetime, timedelta, timezone
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
        # Idempotent cleanup
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
        aarav = User(
            household_id=household.id,
            name="Aarav Sharma",
            phone_number="9876543212",
            password_hash=get_password_hash("password123"),
            role=UserRole.MEMBER,
        )
        db.add_all([admin, pooja, aarav])
        db.commit()
        db.refresh(admin)
        db.refresh(pooja)
        db.refresh(aarav)

        # Create Rajesh accounts
        sbi = Account(user_id=admin.id, name="SBI Salary A/c", type=AccountType.BANK, current_balance=65000.0)
        cash_rajesh = Account(user_id=admin.id, name="Cash Wallet", type=AccountType.CASH, current_balance=4500.0)
        
        # Create Pooja accounts
        hdfc = Account(user_id=pooja.id, name="HDFC Savings A/c", type=AccountType.BANK, current_balance=25000.0)
        home_cash = Account(user_id=pooja.id, name="Home Cash Box", type=AccountType.CASH, current_balance=6000.0)

        # Create Aarav accounts
        student_cash = Account(user_id=aarav.id, name="Student Pocket Cash", type=AccountType.CASH, current_balance=1500.0)

        db.add_all([sbi, cash_rajesh, hdfc, home_cash, student_cash])
        db.commit()
        db.refresh(sbi)
        db.refresh(cash_rajesh)
        db.refresh(hdfc)
        db.refresh(home_cash)
        db.refresh(student_cash)

        now = datetime.now(timezone.utc)
        txs = []
        
        # Inflow
        txs.append(Transaction(user_id=admin.id, account_id=sbi.id, amount=85000.0, type=TransactionType.INCOME, category="Salary", description="Rajesh Salary", date=now - timedelta(days=29)))
        
        # Outflow (Fixed)
        txs.append(Transaction(user_id=admin.id, account_id=sbi.id, amount=18000.0, type=TransactionType.EXPENSE, category="Housing", description="House Rent", date=now - timedelta(days=28)))
        txs.append(Transaction(user_id=admin.id, account_id=cash_rajesh.id, amount=3500.0, type=TransactionType.EXPENSE, category="Housing", description="Maid Salary", date=now - timedelta(days=27)))
        txs.append(Transaction(user_id=pooja.id, account_id=hdfc.id, amount=2200.0, type=TransactionType.EXPENSE, category="Utilities", description="Electricity Bill", date=now - timedelta(days=25)))

        # Outflow (Daily/UPI)
        txs.append(Transaction(user_id=pooja.id, account_id=hdfc.id, amount=4800.0, type=TransactionType.EXPENSE, category="Groceries", description="DMart Kirana", date=now - timedelta(days=20)))
        txs.append(Transaction(user_id=admin.id, account_id=sbi.id, amount=1250.0, type=TransactionType.EXPENSE, category="Groceries", description="BigBasket", date=now - timedelta(days=15)))
        txs.append(Transaction(user_id=admin.id, account_id=sbi.id, amount=650.0, type=TransactionType.EXPENSE, category="Food & Dining", description="Swiggy Dinner", date=now - timedelta(days=10)))
        txs.append(Transaction(user_id=admin.id, account_id=cash_rajesh.id, amount=1400.0, type=TransactionType.EXPENSE, category="Groceries", description="Daily Milk", date=now - timedelta(days=25)))

        # Outflow (Student)
        txs.append(Transaction(user_id=aarav.id, account_id=student_cash.id, amount=750.0, type=TransactionType.EXPENSE, category="Education", description="College Books", date=now - timedelta(days=12)))
        txs.append(Transaction(user_id=aarav.id, account_id=student_cash.id, amount=40.0, type=TransactionType.EXPENSE, category="Food & Dining", description="Canteen Chai & Samosa", date=now - timedelta(days=5)))
        txs.append(Transaction(user_id=aarav.id, account_id=student_cash.id, amount=300.0, type=TransactionType.EXPENSE, category="Transport", description="Metro Recharge", date=now - timedelta(days=2)))

        # Padding to reach 25+ transactions
        for i in range(15):
            txs.append(Transaction(user_id=admin.id, account_id=cash_rajesh.id, amount=50.0, type=TransactionType.EXPENSE, category="Food & Dining", description=f"Tea break {i}", date=now - timedelta(days=20-i)))

        db.add_all(txs)
        db.commit()
        print("Database successfully seeded with realistic Indian household data.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
