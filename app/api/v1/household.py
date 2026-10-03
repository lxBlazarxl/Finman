from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.deps import get_current_user, require_admin
from app.models.account import Account
from app.models.enums import AccountType, UserRole
from app.models.household import Household
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas import HouseholdResponse, HouseholdUpdate, MemberCreateRequest, UserResponse

router = APIRouter(prefix="/household", tags=["Household"])


@router.post("/members", response_model=UserResponse)
def create_member(
    payload: MemberCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
) -> Dict[str, Any]:
    existing = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already taken")

    user = User(
        household_id=current_admin.household_id,
        name=payload.name,
        phone_number=payload.phone_number,
        password_hash=get_password_hash(payload.password),
        role=UserRole.MEMBER,
    )
    db.add(user)
    db.flush()

    db.add(
        Account(
            user_id=user.id,
            name=payload.initial_account_name or "Pocket Cash",
            type=AccountType.CASH,
            current_balance=0.0,
        )
    )

    db.commit()
    return UserResponse.model_validate(user)


@router.get("", response_model=HouseholdResponse)
@router.get("/", response_model=HouseholdResponse, include_in_schema=False)
def get_household(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HouseholdResponse:
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    return HouseholdResponse.model_validate(household)


@router.patch("", response_model=HouseholdResponse)
@router.patch("/", response_model=HouseholdResponse, include_in_schema=False)
def update_household(
    payload: HouseholdUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
) -> HouseholdResponse:
    household = db.query(Household).filter(Household.id == current_admin.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    household.name = payload.name
    db.commit()
    db.refresh(household)
    return HouseholdResponse.model_validate(household)


@router.get("/members", response_model=list[UserResponse])
def list_members(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
) -> list[UserResponse]:
    members = db.query(User).filter(User.household_id == current_admin.household_id).all()
    return [UserResponse.model_validate(m) for m in members]


@router.delete("/members/{user_id}")
def delete_member(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot remove themselves from household",
        )
    member = db.query(User).filter(
        User.id == user_id,
        User.household_id == current_admin.household_id,
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    accounts = db.query(Account).filter(Account.user_id == member.id).all()
    for acc in accounts:
        db.query(Transaction).filter(Transaction.account_id == acc.id).delete()
        db.delete(acc)

    db.delete(member)
    db.commit()
    return {"detail": "Member removed successfully"}
