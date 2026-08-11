import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/interventions", tags=["Interventions"])

# Pre-seeded intervention data
SEED_INTERVENTIONS = [
    {
        "title": "5-Minute Breathing Exercise",
        "type": "breathing",
        "description": "A simple box breathing technique to calm your nervous system and reduce craving intensity.",
        "duration_minutes": 5,
        "instructions": "Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. Repeat 5 times."
    },
    {
        "title": "10-Minute Walk",
        "type": "walking",
        "description": "Physical activity disrupts the craving cycle and releases endorphins.",
        "duration_minutes": 10,
        "instructions": "Go outside or walk around your building for 10 minutes. Focus on your surroundings."
    },
    {
        "title": "Mindfulness Meditation",
        "type": "mindfulness",
        "description": "Observe your craving without acting on it. Cravings peak at around 3 minutes, then pass.",
        "duration_minutes": 5,
        "instructions": "Sit comfortably, close your eyes. Acknowledge the craving, breathe slowly, and let it pass."
    },
    {
        "title": "Drink Cold Water",
        "type": "water",
        "description": "Drinking cold water creates a physical sensation that helps reduce the mouth-feel of craving.",
        "duration_minutes": 1,
        "instructions": "Drink a full glass of cold water slowly. Follow it with another if needed."
    },
    {
        "title": "Distraction Activity",
        "type": "distraction",
        "description": "Redirect your attention away from the craving trigger completely.",
        "duration_minutes": 10,
        "instructions": "Play a mobile game, text a friend, solve a puzzle, or engage in any absorbing activity."
    },
    {
        "title": "Journaling",
        "type": "journaling",
        "description": "Writing down your feelings helps process emotions linked to smoking triggers.",
        "duration_minutes": 5,
        "instructions": "Write about what triggered this craving and how you plan to respond without smoking."
    },
    {
        "title": "Contact a Support Person",
        "type": "support_contact",
        "description": "Reaching out to someone who supports your quit journey can significantly reduce relapse risk.",
        "duration_minutes": 5,
        "instructions": "Call or text a friend, family member, or quit-buddy for encouragement."
    },
]


def seed_interventions(db: Session):
    """Seed the default interventions into the database if not already present."""
    for item in SEED_INTERVENTIONS:
        existing = db.query(models.Intervention).filter(models.Intervention.type == item["type"]).first()
        if not existing:
            iv = models.Intervention(intervention_id=uuid.uuid4(), **item)
            db.add(iv)
    db.commit()


@router.get("", response_model=List[schemas.InterventionResponse])
def list_interventions(db: Session = Depends(get_db)):
    seed_interventions(db)
    return db.query(models.Intervention).filter(models.Intervention.active == True).all()


@router.get("/recommended", response_model=List[schemas.InterventionResponse])
def get_recommended_interventions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    seed_interventions(db)

    # Get latest prediction risk
    latest_pred = db.query(models.RelapsePrediction).filter(
        models.RelapsePrediction.user_id == current_user.user_id
    ).order_by(models.RelapsePrediction.prediction_timestamp.desc()).first()

    risk_level = latest_pred.risk_level if latest_pred else "MEDIUM"

    # Get historically effective interventions for this user
    sessions = db.query(models.InterventionSession).filter(
        models.InterventionSession.user_id == current_user.user_id,
        models.InterventionSession.completed == True
    ).all()

    effective_types = set()
    for s in sessions:
        if s.craving_before and s.craving_after and s.craving_after < s.craving_before:
            iv = db.query(models.Intervention).filter(
                models.Intervention.intervention_id == s.intervention_id
            ).first()
            if iv:
                effective_types.add(iv.type)

    # Determine recommended intervention types by risk level
    if risk_level == "HIGH":
        priority_types = ["breathing", "support_contact", "walking", "distraction"]
    elif risk_level == "MEDIUM":
        priority_types = ["mindfulness", "walking", "water", "breathing"]
    else:
        priority_types = ["journaling", "mindfulness", "water", "distraction"]

    # Prefer effective interventions from user history
    recommended_types = list(effective_types) + [t for t in priority_types if t not in effective_types]
    recommended_types = recommended_types[:4]  # Return max 4

    result = []
    for t in recommended_types:
        iv = db.query(models.Intervention).filter(
            models.Intervention.type == t, models.Intervention.active == True
        ).first()
        if iv:
            result.append(iv)

    return result


@router.post("/{intervention_id}/start", response_model=schemas.InterventionSessionResponse, status_code=201)
def start_intervention(
    intervention_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    iv = db.query(models.Intervention).filter(models.Intervention.intervention_id == intervention_id).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Intervention not found")

    session = models.InterventionSession(
        session_id=uuid.uuid4(),
        user_id=current_user.user_id,
        intervention_id=intervention_id,
        started_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/complete", response_model=schemas.InterventionSessionResponse)
def complete_intervention(
    session_id: uuid.UUID,
    result_in: schemas.InterventionSessionComplete,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session = db.query(models.InterventionSession).filter(
        models.InterventionSession.session_id == session_id,
        models.InterventionSession.user_id == current_user.user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intervention session not found")

    session.craving_before = result_in.craving_before
    session.craving_after = result_in.craving_after
    session.duration_seconds = result_in.duration_seconds
    session.completed = True
    session.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(session)
    return session
