import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.services import ml_service

router = APIRouter(prefix="/predictions", tags=["Relapse Prediction"])


@router.post("/relapse", response_model=schemas.RelapsePredictionResponse, status_code=201)
def predict_relapse(
    data: schemas.RelapsePredictionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = ml_service.predict_relapse_risk(
        craving_level=data.craving_level,
        stress_level=data.stress_level,
        smoke_free_days=data.smoke_free_days,
        previous_relapses=data.previous_relapses,
        cigarettes_per_day=data.cigarettes_per_day,
        hour=data.hour,
        trigger=data.trigger
    )

    prediction = models.RelapsePrediction(
        prediction_id=uuid.uuid4(),
        user_id=current_user.user_id,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        confidence_score=result["confidence_score"],
        top_factors=result["top_factors"],
        prediction_timestamp=datetime.utcnow(),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


@router.get("/relapse/history", response_model=List[schemas.RelapsePredictionResponse])
def get_prediction_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    preds = db.query(models.RelapsePrediction).filter(
        models.RelapsePrediction.user_id == current_user.user_id
    ).order_by(models.RelapsePrediction.prediction_timestamp.desc()).offset(offset).limit(limit).all()
    return preds


@router.get("/relapse/latest", response_model=schemas.RelapsePredictionResponse)
def get_latest_prediction(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    pred = db.query(models.RelapsePrediction).filter(
        models.RelapsePrediction.user_id == current_user.user_id
    ).order_by(models.RelapsePrediction.prediction_timestamp.desc()).first()
    if not pred:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No predictions found")
    return pred
