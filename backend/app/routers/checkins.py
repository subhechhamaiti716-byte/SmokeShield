import uuid
from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/checkins", tags=["Daily Check-ins"])


@router.post("", response_model=schemas.DailyCheckInResponse, status_code=201)
def submit_checkin(
    checkin_in: schemas.DailyCheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()

    # Update recovery progress based on today's smoking status
    rp = db.query(models.RecoveryProgress).filter(
        models.RecoveryProgress.user_id == current_user.user_id
    ).first()
    if rp:
        if not checkin_in.smoked_today:
            rp.current_streak += 1
            rp.smoke_free_days += 1
            if rp.current_streak > rp.longest_streak:
                rp.longest_streak = rp.current_streak

            # Cigarettes avoided + money saved calculation
            profile = db.query(models.SmokingProfile).filter(
                models.SmokingProfile.user_id == current_user.user_id
            ).first()
            if profile:
                rp.cigarettes_avoided += profile.cigarettes_per_day
                rp.money_saved += profile.cigarettes_per_day * profile.average_cigarette_cost
        else:
            rp.current_streak = 0
            rp.last_smoked_at = datetime.utcnow()

    new_checkin = models.DailyCheckIn(
        checkin_id=uuid.uuid4(),
        user_id=current_user.user_id,
        checkin_date=today,
        stress_level=checkin_in.stress_level,
        mood_level=checkin_in.mood_level,
        craving_level=checkin_in.craving_level,
        sleep_hours=checkin_in.sleep_hours,
        smoked_today=checkin_in.smoked_today,
        notes=checkin_in.notes,
    )
    db.add(new_checkin)
    db.commit()
    db.refresh(new_checkin)
    return new_checkin


@router.get("/today", response_model=schemas.DailyCheckInResponse)
def get_today_checkin(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    checkin = db.query(models.DailyCheckIn).filter(
        models.DailyCheckIn.user_id == current_user.user_id,
        models.DailyCheckIn.checkin_date == today
    ).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="No check-in recorded today")
    return checkin


@router.get("", response_model=List[schemas.DailyCheckInResponse])
def get_checkin_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    checkins = db.query(models.DailyCheckIn).filter(
        models.DailyCheckIn.user_id == current_user.user_id
    ).order_by(models.DailyCheckIn.checkin_date.desc()).offset(offset).limit(limit).all()
    return checkins
