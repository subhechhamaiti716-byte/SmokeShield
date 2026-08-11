from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/recovery", tags=["Recovery Tracking"])


@router.get("/progress", response_model=schemas.RecoveryProgressResponse)
def get_recovery_progress(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    rp = db.query(models.RecoveryProgress).filter(
        models.RecoveryProgress.user_id == current_user.user_id
    ).first()
    if not rp:
        return {
            "smoke_free_days": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "cigarettes_avoided": 0,
            "money_saved": 0.0,
            "quit_date": None,
            "last_smoked_at": None
        }
    return rp


@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Return a comprehensive analytics snapshot for the user dashboard."""
    cravings = db.query(models.CravingLog).filter(
        models.CravingLog.user_id == current_user.user_id
    ).all()

    checkins = db.query(models.DailyCheckIn).filter(
        models.DailyCheckIn.user_id == current_user.user_id
    ).all()

    rp = db.query(models.RecoveryProgress).filter(
        models.RecoveryProgress.user_id == current_user.user_id
    ).first()

    # Trigger frequency
    triggers = [c.trigger for c in cravings if c.trigger]
    trigger_freq = {}
    for t in triggers:
        trigger_freq[t] = trigger_freq.get(t, 0) + 1

    # Average craving and stress
    avg_craving = round(sum(c.craving_level for c in cravings) / len(cravings), 1) if cravings else 0.0
    avg_stress = round(
        sum(c.stress_level for c in cravings if c.stress_level) /
        max(1, len([c for c in cravings if c.stress_level])), 1
    )

    # High risk time period
    hours = [c.timestamp.hour for c in cravings if c.craving_level >= 7]
    high_risk_period = None
    if hours:
        peak = max(set(hours), key=hours.count)
        high_risk_period = f"{peak:02d}:00 - {(peak+2)%24:02d}:00"

    return {
        "smoke_free_days": rp.smoke_free_days if rp else 0,
        "current_streak": rp.current_streak if rp else 0,
        "cigarettes_avoided": rp.cigarettes_avoided if rp else 0,
        "money_saved": rp.money_saved if rp else 0.0,
        "average_craving": avg_craving,
        "average_stress": avg_stress,
        "common_trigger": max(trigger_freq, key=trigger_freq.get) if trigger_freq else None,
        "trigger_frequency": trigger_freq,
        "high_risk_period": high_risk_period,
        "total_checkins": len(checkins),
        "smoke_free_days_from_checkins": len([c for c in checkins if not c.smoked_today]),
    }
