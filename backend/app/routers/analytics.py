from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, date
from pydantic import BaseModel

from app.database import get_db
from app.deps import get_current_user
from app.models import User, SmokingLog, CravingLog, DailyCheckIn, InterventionSession

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class DailyPoint(BaseModel):
    date: str
    value: float


class TriggerStat(BaseModel):
    trigger: str
    count: int


class HourStat(BaseModel):
    hour: int
    count: int
    label: str


class AnalyticsSummaryOut(BaseModel):
    period_days: int
    smoking_trend: List[DailyPoint]
    craving_trend: List[DailyPoint]
    stress_trend: List[DailyPoint]
    mood_trend: List[DailyPoint]
    common_triggers: List[TriggerStat]
    high_risk_hours: List[HourStat]
    avg_craving: float
    avg_stress: float
    total_cravings: int
    total_cigarettes: int
    interventions_completed: int
    weekly_summary: dict


@router.get("/summary", response_model=AnalyticsSummaryOut)
def get_analytics_summary(
    days: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)

    smoking_logs = db.query(SmokingLog).filter(
        SmokingLog.user_id == current_user.user_id,
        SmokingLog.timestamp >= since,
    ).all()

    craving_logs = db.query(CravingLog).filter(
        CravingLog.user_id == current_user.user_id,
        CravingLog.timestamp >= since,
    ).all()

    checkins = db.query(DailyCheckIn).filter(
        DailyCheckIn.user_id == current_user.user_id,
        DailyCheckIn.created_at >= since,
    ).all()

    # Build daily aggregates
    smoking_by_day: dict = {}
    for log in smoking_logs:
        d = log.timestamp.date().isoformat()
        smoking_by_day[d] = smoking_by_day.get(d, 0) + log.cigarettes

    craving_by_day: dict = {}
    for log in craving_logs:
        d = log.timestamp.date().isoformat()
        craving_by_day.setdefault(d, []).append(log.craving_level)

    stress_by_day: dict = {}
    mood_by_day: dict = {}
    for ci in checkins:
        d = ci.checkin_date.isoformat() if isinstance(ci.checkin_date, date) else str(ci.checkin_date)
        if ci.stress_level is not None:
            stress_by_day.setdefault(d, []).append(ci.stress_level)
        if ci.mood_level is not None:
            mood_by_day.setdefault(d, []).append(ci.mood_level)

    # Generate last N days
    all_days = [
        (datetime.utcnow() - timedelta(days=i)).date().isoformat()
        for i in range(days - 1, -1, -1)
    ]

    def avg_list(lst): return round(sum(lst) / len(lst), 1) if lst else 0.0

    smoking_trend = [DailyPoint(date=d, value=smoking_by_day.get(d, 0)) for d in all_days]
    craving_trend = [DailyPoint(date=d, value=avg_list(craving_by_day.get(d, []))) for d in all_days]
    stress_trend  = [DailyPoint(date=d, value=avg_list(stress_by_day.get(d, [])))  for d in all_days]
    mood_trend    = [DailyPoint(date=d, value=avg_list(mood_by_day.get(d, [])))    for d in all_days]

    # Common triggers
    trigger_map: dict = {}
    for log in craving_logs:
        if log.trigger:
            trigger_map[log.trigger] = trigger_map.get(log.trigger, 0) + 1
    for log in smoking_logs:
        if log.trigger:
            trigger_map[log.trigger] = trigger_map.get(log.trigger, 0) + 1
    common_triggers = sorted(
        [TriggerStat(trigger=k, count=v) for k, v in trigger_map.items()],
        key=lambda x: x.count, reverse=True,
    )[:8]

    # High-risk hours
    hour_map: dict = {}
    for log in craving_logs:
        h = log.timestamp.hour
        hour_map[h] = hour_map.get(h, 0) + 1
    hour_labels = {
        **{h: f"{h}:00" for h in range(0, 12)},
        **{h: f"{h}:00" for h in range(12, 24)},
    }
    high_risk_hours = sorted(
        [HourStat(hour=h, count=c, label=f"{h:02d}:00") for h, c in hour_map.items()],
        key=lambda x: x.count, reverse=True,
    )[:5]

    # Aggregates
    all_craving_levels = [l.craving_level for l in craving_logs]
    all_stress_levels  = [l.stress_level for l in craving_logs if l.stress_level is not None]
    avg_craving = avg_list(all_craving_levels)
    avg_stress  = avg_list(all_stress_levels)
    total_cigarettes = sum(l.cigarettes for l in smoking_logs)
    interventions_done = db.query(InterventionSession).filter_by(
        user_id=current_user.user_id, completed=True
    ).count()

    # Weekly summary (last 7 days)
    week_since = datetime.utcnow() - timedelta(days=7)
    week_cravings = [l for l in craving_logs if l.timestamp >= week_since]
    week_smokes = [l for l in smoking_logs if l.timestamp >= week_since]
    weekly_summary = {
        "cravings_this_week": len(week_cravings),
        "cigarettes_this_week": sum(l.cigarettes for l in week_smokes),
        "avg_craving_this_week": avg_list([l.craving_level for l in week_cravings]),
    }

    return AnalyticsSummaryOut(
        period_days=days,
        smoking_trend=smoking_trend,
        craving_trend=craving_trend,
        stress_trend=stress_trend,
        mood_trend=mood_trend,
        common_triggers=common_triggers,
        high_risk_hours=high_risk_hours,
        avg_craving=avg_craving,
        avg_stress=avg_stress,
        total_cravings=len(craving_logs),
        total_cigarettes=total_cigarettes,
        interventions_completed=interventions_done,
        weekly_summary=weekly_summary,
    )
