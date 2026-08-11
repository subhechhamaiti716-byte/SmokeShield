import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user
from app.services import ai_service, ml_service

router = APIRouter(prefix="/ai", tags=["AI Coach"])


@router.post("/chat", response_model=schemas.AIChatResponse, status_code=201)
def chat_with_coach(
    chat_in: schemas.AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Get or create conversation
    if chat_in.conversation_id:
        conversation = db.query(models.AIConversation).filter(
            models.AIConversation.conversation_id == chat_in.conversation_id,
            models.AIConversation.user_id == current_user.user_id
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = models.AIConversation(
            conversation_id=uuid.uuid4(),
            user_id=current_user.user_id,
            context_type="General",
        )
        db.add(conversation)
        db.flush()

    # Save user message
    user_msg = models.AIMessage(
        message_id=uuid.uuid4(),
        conversation_id=conversation.conversation_id,
        sender_type="USER",
        message_text=chat_in.message,
    )
    db.add(user_msg)

    # Gather latest ML context
    latest_pred = db.query(models.RelapsePrediction).filter(
        models.RelapsePrediction.user_id == current_user.user_id
    ).order_by(models.RelapsePrediction.prediction_timestamp.desc()).first()

    risk_level = latest_pred.risk_level if latest_pred else "UNKNOWN"
    risk_score = latest_pred.risk_score if latest_pred else 0.0
    top_factors = latest_pred.top_factors if latest_pred else []

    profile = db.query(models.SmokingProfile).filter(
        models.SmokingProfile.user_id == current_user.user_id
    ).first()
    cpd = profile.cigarettes_per_day if profile else 10
    trigger = profile.common_triggers[0] if (profile and profile.common_triggers) else "general"

    # Get previously successful intervention types
    prev_sessions = db.query(models.InterventionSession).filter(
        models.InterventionSession.user_id == current_user.user_id,
        models.InterventionSession.completed == True
    ).order_by(models.InterventionSession.completed_at.desc()).limit(5).all()

    prev_intervention_types = []
    for s in prev_sessions:
        iv = db.query(models.Intervention).filter(
            models.Intervention.intervention_id == s.intervention_id
        ).first()
        if iv:
            prev_intervention_types.append(iv.type)

    # Generate AI response
    ai_result = ai_service.generate_coach_response(
        user_message=chat_in.message,
        full_name=current_user.full_name,
        cigarettes_per_day=cpd,
        risk_level=risk_level,
        risk_score=risk_score,
        top_factors=top_factors,
        trigger=trigger,
        previous_interventions=prev_intervention_types
    )

    # Save AI message
    ai_msg = models.AIMessage(
        message_id=uuid.uuid4(),
        conversation_id=conversation.conversation_id,
        sender_type="AI",
        message_text=ai_result["response"],
        model_provider=ai_result.get("model_provider", "Unknown"),
    )
    db.add(ai_msg)
    db.commit()

    return {
        "message_id": ai_msg.message_id,
        "conversation_id": conversation.conversation_id,
        "response": ai_result["response"],
        "suggested_intervention": ai_result.get("suggested_intervention"),
        "risk_level": risk_level,
    }


@router.get("/conversations", response_model=List[schemas.AIConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    convs = db.query(models.AIConversation).filter(
        models.AIConversation.user_id == current_user.user_id
    ).order_by(models.AIConversation.started_at.desc()).limit(20).all()
    return convs


@router.get("/conversations/{conversation_id}", response_model=schemas.AIConversationResponse)
def get_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    conv = db.query(models.AIConversation).filter(
        models.AIConversation.conversation_id == conversation_id,
        models.AIConversation.user_id == current_user.user_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv
