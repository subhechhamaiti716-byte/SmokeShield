import uuid
from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/cravings", tags=["Craving Tracking"])


@router.post("", response_model=schemas.CravingLogResponse, status_code=201)
def log_craving(
    craving_in: schemas.CravingLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ts = craving_in.timestamp or datetime.utcnow()
    new_craving = models.CravingLog(
        craving_id=uuid.uuid4(),
        user_id=current_user.user_id,
        craving_level=craving_in.craving_level,
        stress_level=craving_in.stress_level,
        mood_level=craving_in.mood_level,
        trigger=craving_in.trigger,
        timestamp=ts,
        notes=craving_in.notes,
    )
    db.add(new_craving)
    db.commit()
    db.refresh(new_craving)
    return new_craving


@router.get("/today", response_model=List[schemas.CravingLogResponse])
def get_today_cravings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    cravings = db.query(models.CravingLog).filter(
        models.CravingLog.user_id == current_user.user_id,
        models.CravingLog.timestamp >= datetime.combine(today, datetime.min.time()),
        models.CravingLog.timestamp < datetime.combine(today, datetime.max.time()),
    ).all()
    return cravings


@router.get("", response_model=List[schemas.CravingLogResponse])
def get_craving_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    cravings = db.query(models.CravingLog).filter(
        models.CravingLog.user_id == current_user.user_id
    ).order_by(models.CravingLog.timestamp.desc()).offset(offset).limit(limit).all()
    return cravings


@router.get("/stats")
def get_craving_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    cravings = db.query(models.CravingLog).filter(
        models.CravingLog.user_id == current_user.user_id
    ).all()

    if not cravings:
        return {"average_craving": 0, "highest_craving": 0, "common_trigger": None, "total_logged": 0}

    levels = [c.craving_level for c in cravings]
    triggers = [c.trigger for c in cravings if c.trigger]
    most_common = max(set(triggers), key=triggers.count) if triggers else None

    # Determine high-risk hour bucket
    hours = [c.timestamp.hour for c in cravings if c.craving_level >= 7]
    high_risk_period = None
    if hours:
        peak_hour = max(set(hours), key=hours.count)
        high_risk_period = f"{peak_hour:02d}:00 - {(peak_hour + 2) % 24:02d}:00"

    return {
        "average_craving": round(sum(levels) / len(levels), 1),
        "highest_craving": max(levels),
        "common_trigger": most_common,
        "high_risk_period": high_risk_period,
        "total_logged": len(cravings)
    }
