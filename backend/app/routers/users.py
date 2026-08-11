import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_profile(
    updates: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if "full_name" in updates:
        current_user.full_name = updates["full_name"]
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/smoking-profile", response_model=schemas.SmokingProfileResponse, status_code=201)
def create_smoking_profile(
    profile_in: schemas.SmokingProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.SmokingProfile).filter(
        models.SmokingProfile.user_id == current_user.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Smoking profile already exists. Use PUT to update.")

    profile = models.SmokingProfile(
        profile_id=uuid.uuid4(),
        user_id=current_user.user_id,
        **profile_in.model_dump()
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/smoking-profile", response_model=schemas.SmokingProfileResponse)
def get_smoking_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    profile = db.query(models.SmokingProfile).filter(
        models.SmokingProfile.user_id == current_user.user_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Smoking profile not found")
    return profile


@router.put("/smoking-profile", response_model=schemas.SmokingProfileResponse)
def update_smoking_profile(
    updates: schemas.SmokingProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    profile = db.query(models.SmokingProfile).filter(
        models.SmokingProfile.user_id == current_user.user_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Smoking profile not found. Use POST to create.")

    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
