from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.sms import SMSParseRequest, SMSParseResult
from datetime import datetime, timezone

from fastapi import Query

from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.balance_service import apply_transaction_balance, revert_transaction_balance
from app.services.sms_parser import parse_bank_sms

from app.models.enums import TransactionType, UserRole
from app.models.user import User

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("/parse-sms", response_model=SMSParseResult)
def parse_sms(payload: SMSParseRequest) -> SMSParseResult:
    return parse_bank_sms(payload.sms_text)


@router.post("", response_model=TransactionResponse)
@router.post("/", response_model=TransactionResponse)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TransactionResponse:
    account = db.query(Account).filter(Account.id == payload.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if current_user.role != UserRole.ADMIN and account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    apply_transaction_balance(db, account, payload.type, payload.amount)

    tx_date = payload.date if payload.date is not None else datetime.now(timezone.utc)
    tx = Transaction(
        account_id=account.id,
        user_id=current_user.id,
        amount=payload.amount,
        type=payload.type,
        category=payload.category,
        description=payload.description,
        raw_sms=payload.raw_sms,
        date=tx_date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)


@router.get("", response_model=list[TransactionResponse])
@router.get("/", response_model=list[TransactionResponse])
def get_transactions(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category: str | None = None,
    account_id: str | None = None,
    type: TransactionType | None = None,
    target_user_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[TransactionResponse]:
    query = db.query(Transaction).join(User)

    if current_user.role == UserRole.MEMBER:
        query = query.filter(Transaction.user_id == current_user.id)
    else:
        if target_user_id is not None:
            target = db.query(User).filter(User.id == target_user_id).first()
            if not target or target.household_id != current_user.household_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
            query = query.filter(Transaction.user_id == target_user_id)
        else:
            query = query.filter(User.household_id == current_user.household_id)

    if start_date is not None:
        query = query.filter(Transaction.date >= start_date)
    if end_date is not None:
        query = query.filter(Transaction.date <= end_date)
    if category is not None:
        query = query.filter(Transaction.category.ilike(f"%{category}%"))
    if account_id is not None:
        query = query.filter(Transaction.account_id == account_id)
    if type is not None:
        query = query.filter(Transaction.type == type)

    txs = (
        query.order_by(Transaction.date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [TransactionResponse.model_validate(tx) for tx in txs]


DEFAULT_CATEGORIES = [
    "Food & Dining",
    "Groceries",
    "Transport",
    "Shopping",
    "Bills & Utilities",
    "Entertainment",
    "Health & Medical",
    "Education",
    "Salary",
    "Investment",
    "Miscellaneous",
]


@router.get("/categories", response_model=list[str])
def list_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[str]:
    db_cats = (
        db.query(Transaction.category)
        .join(User)
        .filter(User.household_id == current_user.household_id)
        .distinct()
        .all()
    )
    custom = [c[0] for c in db_cats if c[0]]
    combined = list(dict.fromkeys(DEFAULT_CATEGORIES + custom))
    return combined


@router.get("/{id}", response_model=TransactionResponse)
def get_transaction(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TransactionResponse:
    tx = db.query(Transaction).filter(Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if current_user.role != UserRole.ADMIN and tx.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    if current_user.role == UserRole.ADMIN:
        owner = db.query(User).filter(User.id == tx.user_id).first()
        if not owner or owner.household_id != current_user.household_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    return TransactionResponse.model_validate(tx)


@router.patch("/{id}", response_model=TransactionResponse)
def update_transaction(
    id: str,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TransactionResponse:
    tx = db.query(Transaction).filter(Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if current_user.role != UserRole.ADMIN and tx.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    if current_user.role == UserRole.ADMIN:
        owner = db.query(User).filter(User.id == tx.user_id).first()
        if not owner or owner.household_id != current_user.household_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    account = db.query(Account).filter(Account.id == tx.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    amount_changed = payload.amount is not None and payload.amount != tx.amount
    type_changed = payload.type is not None and payload.type != tx.type
    account_changed = payload.account_id is not None and payload.account_id != tx.account_id

    if amount_changed or type_changed or account_changed:
        revert_transaction_balance(db, account, tx.type, tx.amount)

        if account_changed:
            target_account = db.query(Account).filter(Account.id == payload.account_id).first()
            if not target_account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target account not found")
            if current_user.role != UserRole.ADMIN and target_account.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions for target account")
            tx.account_id = target_account.id
            account = target_account

        if payload.amount is not None:
            tx.amount = payload.amount
        if payload.type is not None:
            tx.type = payload.type

        apply_transaction_balance(db, account, tx.type, tx.amount)

    if payload.category is not None:
        tx.category = payload.category
    if payload.description is not None:
        tx.description = payload.description
    if payload.date is not None:
        tx.date = payload.date

    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)


@router.delete("/{id}")
def delete_transaction(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if current_user.role != UserRole.ADMIN and tx.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    if current_user.role == UserRole.ADMIN:
        owner = db.query(User).filter(User.id == tx.user_id).first()
        if not owner or owner.household_id != current_user.household_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    account = db.query(Account).filter(Account.id == tx.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    revert_transaction_balance(db, account, tx.type, tx.amount)
    db.delete(tx)
    db.commit()
    return {"detail": "Transaction deleted successfully"}
