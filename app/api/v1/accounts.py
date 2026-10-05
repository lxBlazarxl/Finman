from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.account import Account
from app.models.enums import UserRole
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("", response_model=AccountResponse)
@router.post("/", response_model=AccountResponse, include_in_schema=False)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    account = Account(
        user_id=current_user.id,
        name=payload.name,
        type=payload.type,
        current_balance=payload.initial_balance,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return AccountResponse.model_validate(account)


@router.get("", response_model=List[AccountResponse])
@router.get("/", response_model=List[AccountResponse], include_in_schema=False)
def list_accounts(
    scope: Optional[str] = None,
    target_user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> List[AccountResponse]:
    if current_user.role == UserRole.MEMBER:
        accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    else:
        if target_user_id is not None:
            target = db.query(User).filter(User.id == target_user_id).first()
            if not target or target.household_id != current_user.household_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
            accounts = db.query(Account).filter(Account.user_id == target_user_id).all()
        elif scope == "household":
            accounts = db.query(Account).join(User).filter(User.household_id == current_user.household_id).all()
        else:
            accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return [AccountResponse.model_validate(a) for a in accounts]


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AccountResponse:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if current_user.role != UserRole.ADMIN and account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    if current_user.role == UserRole.ADMIN:
        owner = db.query(User).filter(User.id == account.user_id).first()
        if not owner or owner.household_id != current_user.household_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    return AccountResponse.model_validate(account)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: str,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AccountResponse:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if current_user.role != UserRole.ADMIN and account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    if current_user.role == UserRole.ADMIN:
        owner = db.query(User).filter(User.id == account.user_id).first()
        if not owner or owner.household_id != current_user.household_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    if payload.name is not None:
        account.name = payload.name
    if payload.type is not None:
        account.type = payload.type
    db.commit()
    db.refresh(account)
    return AccountResponse.model_validate(account)


@router.delete("/{account_id}")
def delete_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if current_user.role != UserRole.ADMIN and account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    if current_user.role == UserRole.ADMIN:
        owner = db.query(User).filter(User.id == account.user_id).first()
        if not owner or owner.household_id != current_user.household_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    db.query(Transaction).filter(Transaction.account_id == account.id).delete()
    db.delete(account)
    db.commit()
    return {"detail": "Account deleted successfully"}
