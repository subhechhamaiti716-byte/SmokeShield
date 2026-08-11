from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.deps import get_current_user
from app.models import User, Achievement, UserAchievement, RecoveryProgress, CravingLog, InterventionSession, Notification
from pydantic import BaseModel

router = APIRouter(prefix="/achievements", tags=["Achievements"])


class AchievementOut(BaseModel):
    achievement_id: str
    key: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    points: int
    category: Optional[str] = None
    unlocked: bool
    unlocked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserPointsOut(BaseModel):
    total_points: int
    achievements_unlocked: int
    total_achievements: int
    level: str


DEFAULT_ACHIEVEMENTS = [
    {"key": "FIRST_LOGIN",       "title": "First Step",         "icon": "🌱", "description": "Joined SmokeShield",                    "points": 10,   "category": "general",       "threshold": 1},
    {"key": "DAY_1",             "title": "24 Hours Strong",    "icon": "⭐", "description": "1 smoke-free day",                      "points": 50,   "category": "streak",        "threshold": 1},
    {"key": "DAY_3",             "title": "3-Day Warrior",      "icon": "⚔️", "description": "3 smoke-free days",                     "points": 100,  "category": "streak",        "threshold": 3},
    {"key": "WEEK_1",            "title": "One Week Free",      "icon": "🏆", "description": "7 smoke-free days",                     "points": 200,  "category": "streak",        "threshold": 7},
    {"key": "WEEK_2",            "title": "Two Weeks Strong",   "icon": "💪", "description": "14 smoke-free days",                    "points": 300,  "category": "streak",        "threshold": 14},
    {"key": "MONTH_1",           "title": "One Month Champion", "icon": "👑", "description": "30 smoke-free days",                    "points": 500,  "category": "streak",        "threshold": 30},
    {"key": "MONTH_3",           "title": "90-Day Legend",      "icon": "🦅", "description": "90 smoke-free days",                    "points": 1000, "category": "streak",        "threshold": 90},
    {"key": "CRAVING_FIRST",     "title": "Craving Buster",     "icon": "🛡️", "description": "Logged your first craving",             "points": 20,   "category": "craving",       "threshold": 1},
    {"key": "CRAVING_10",        "title": "Craving Veteran",    "icon": "🎯", "description": "Tracked 10 cravings",                   "points": 100,  "category": "craving",       "threshold": 10},
    {"key": "CRAVING_50",        "title": "Craving Master",     "icon": "🧠", "description": "Tracked 50 cravings",                   "points": 300,  "category": "craving",       "threshold": 50},
    {"key": "INTERVENTION_FIRST","title": "Coping Hero",        "icon": "🧘", "description": "Completed your first coping activity",  "points": 50,   "category": "intervention",  "threshold": 1},
    {"key": "INTERVENTION_10",   "title": "Coping Master",      "icon": "🏅", "description": "Completed 10 coping activities",        "points": 200,  "category": "intervention",  "threshold": 10},
    {"key": "MONEY_100",         "title": "₹100 Saved",         "icon": "💰", "description": "Saved ₹100 by not smoking",             "points": 100,  "category": "recovery",      "threshold": 100},
    {"key": "MONEY_500",         "title": "₹500 Saved",         "icon": "💎", "description": "Saved ₹500 by not smoking",             "points": 300,  "category": "recovery",      "threshold": 500},
]


def ensure_achievements_seeded(db: Session):
    for ach in DEFAULT_ACHIEVEMENTS:
        existing = db.query(Achievement).filter_by(key=ach["key"]).first()
        if not existing:
            db.add(Achievement(**ach))
    db.commit()


def check_and_award_achievements(user: User, db: Session) -> List[Achievement]:
    """Check all criteria and award any new achievements. Returns newly unlocked ones."""
    ensure_achievements_seeded(db)
    newly_unlocked = []

    already_unlocked_ids = {
        str(ua.achievement_id)
        for ua in db.query(UserAchievement).filter_by(user_id=user.user_id).all()
    }
    all_achievements = db.query(Achievement).all()

    recovery = db.query(RecoveryProgress).filter_by(user_id=user.user_id).first()
    craving_count = db.query(CravingLog).filter_by(user_id=user.user_id).count()
    interventions_done = db.query(InterventionSession).filter_by(user_id=user.user_id, completed=True).count()

    smoke_free_days = recovery.smoke_free_days if recovery else 0
    money_saved = recovery.money_saved if recovery else 0

    for ach in all_achievements:
        if str(ach.achievement_id) in already_unlocked_ids:
            continue

        unlocked = False
        if ach.key == "FIRST_LOGIN":
            unlocked = True
        elif ach.category == "streak":
            unlocked = smoke_free_days >= (ach.threshold or 0)
        elif ach.key == "CRAVING_FIRST":
            unlocked = craving_count >= 1
        elif ach.key == "CRAVING_10":
            unlocked = craving_count >= 10
        elif ach.key == "CRAVING_50":
            unlocked = craving_count >= 50
        elif ach.key == "INTERVENTION_FIRST":
            unlocked = interventions_done >= 1
        elif ach.key == "INTERVENTION_10":
            unlocked = interventions_done >= 10
        elif ach.key == "MONEY_100":
            unlocked = money_saved >= 100
        elif ach.key == "MONEY_500":
            unlocked = money_saved >= 500

        if unlocked:
            ua = UserAchievement(user_id=user.user_id, achievement_id=ach.achievement_id)
            db.add(ua)
            notif = Notification(
                user_id=user.user_id,
                title=f"Achievement Unlocked! {ach.icon}",
                body=f"{ach.title} — {ach.description}. You earned {ach.points} points!",
                type="achievement",
                data={"achievement_key": ach.key, "points": ach.points}
            )
            db.add(notif)
            newly_unlocked.append(ach)

    if newly_unlocked:
        db.commit()

    return newly_unlocked


@router.get("", response_model=List[AchievementOut])
def list_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_achievements_seeded(db)
    check_and_award_achievements(current_user, db)

    all_achievements = db.query(Achievement).all()
    unlocked_map = {
        str(ua.achievement_id): ua.unlocked_at
        for ua in db.query(UserAchievement).filter_by(user_id=current_user.user_id).all()
    }

    result = []
    for ach in all_achievements:
        aid = str(ach.achievement_id)
        result.append(AchievementOut(
            achievement_id=aid,
            key=ach.key,
            title=ach.title,
            description=ach.description,
            icon=ach.icon,
            points=ach.points,
            category=ach.category,
            unlocked=aid in unlocked_map,
            unlocked_at=unlocked_map.get(aid)
        ))
    return result


@router.get("/points", response_model=UserPointsOut)
def get_user_points(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_achievements_seeded(db)
    unlocked = db.query(UserAchievement).filter_by(user_id=current_user.user_id).all()
    total_points = 0
    for ua in unlocked:
        ach = db.query(Achievement).filter_by(achievement_id=ua.achievement_id).first()
        if ach:
            total_points += ach.points

    if total_points >= 2000:
        level = "Diamond"
    elif total_points >= 1000:
        level = "Platinum"
    elif total_points >= 500:
        level = "Gold"
    elif total_points >= 200:
        level = "Silver"
    else:
        level = "Bronze"

    total_achievements = db.query(Achievement).count()
    return UserPointsOut(
        total_points=total_points,
        achievements_unlocked=len(unlocked),
        total_achievements=total_achievements,
        level=level
    )
