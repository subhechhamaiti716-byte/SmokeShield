import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = security.hash_password(user_in.password)
    new_user = models.User(
        user_id=uuid.uuid4(),
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=hashed,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create empty recovery progress record
    rp = models.RecoveryProgress(recovery_id=uuid.uuid4(), user_id=new_user.user_id)
    db.add(rp)
    db.commit()

    return new_user


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not security.verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    access_token = security.create_access_token(
        subject=str(user.user_id),
        expires_delta=timedelta(hours=1)
    )
    return {"access_token": access_token, "token_type": "Bearer", "expires_in": 3600}


@router.get("/verify")
def verify_token(db: Session = Depends(get_db), token: str = ""):
    user_id = security.decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True, "user_id": user_id}
