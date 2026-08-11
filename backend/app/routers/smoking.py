import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/smoking", tags=["Smoking Tracking"])


@router.post("/logs", response_model=schemas.SmokingLogResponse, status_code=201)
def log_smoking(
    log_in: schemas.SmokingLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ts = log_in.timestamp or datetime.utcnow()
    new_log = models.SmokingLog(
        smoking_log_id=uuid.uuid4(),
        user_id=current_user.user_id,
        cigarettes=log_in.cigarettes,
        timestamp=ts,
        trigger=log_in.trigger,
        stress_level=log_in.stress_level,
        mood_level=log_in.mood_level,
        location=log_in.location,
        notes=log_in.notes,
    )
    db.add(new_log)

    # Update recovery progress: reset streak / last smoked timestamp
    rp = db.query(models.RecoveryProgress).filter(
        models.RecoveryProgress.user_id == current_user.user_id
    ).first()
    if rp:
        rp.last_smoked_at = ts
        rp.current_streak = 0

    db.commit()
    db.refresh(new_log)
    return new_log


@router.get("/logs", response_model=List[schemas.SmokingLogResponse])
def get_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    logs = db.query(models.SmokingLog).filter(
        models.SmokingLog.user_id == current_user.user_id
    ).order_by(models.SmokingLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs


@router.get("/stats")
def get_smoking_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    logs = db.query(models.SmokingLog).filter(
        models.SmokingLog.user_id == current_user.user_id
    ).all()

    if not logs:
        return {
            "total_cigarettes": 0,
            "average_daily": 0.0,
            "most_common_trigger": None,
            "log_count": 0
        }

    total = sum(l.cigarettes for l in logs)
    triggers = [l.trigger for l in logs if l.trigger]
    most_common = max(set(triggers), key=triggers.count) if triggers else None

    # Average daily based on distinct days
    distinct_days = len(set(l.timestamp.date() for l in logs)) or 1
    avg_daily = round(total / distinct_days, 1)

    return {
        "total_cigarettes": total,
        "average_daily": avg_daily,
        "most_common_trigger": most_common,
        "log_count": len(logs)
    }
