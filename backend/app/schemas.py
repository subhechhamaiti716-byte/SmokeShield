from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import List, Optional
from uuid import UUID

# User / Auth Schemas
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 3600

class UserResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Smoking Profile Schemas
class SmokingProfileCreate(BaseModel):
    cigarettes_per_day: int = Field(..., ge=0)
    years_smoking: float = Field(..., ge=0)
    previous_quit_attempts: int = Field(default=0, ge=0)
    previous_relapses: int = Field(default=0, ge=0)
    average_cigarette_cost: float = Field(..., ge=0)
    target_quit_date: Optional[date] = None
    common_triggers: Optional[List[str]] = []

class SmokingProfileUpdate(BaseModel):
    cigarettes_per_day: Optional[int] = Field(None, ge=0)
    years_smoking: Optional[float] = Field(None, ge=0)
    previous_quit_attempts: Optional[int] = Field(None, ge=0)
    previous_relapses: Optional[int] = Field(None, ge=0)
    average_cigarette_cost: Optional[float] = Field(None, ge=0)
    target_quit_date: Optional[date] = None
    common_triggers: Optional[List[str]] = None

class SmokingProfileResponse(SmokingProfileCreate):
    profile_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Smoking Log Schemas
class SmokingLogCreate(BaseModel):
    cigarettes: int = Field(default=1, ge=1)
    timestamp: Optional[datetime] = None
    trigger: Optional[str] = None
    stress_level: Optional[int] = Field(None, ge=0, le=10)
    mood_level: Optional[int] = Field(None, ge=0, le=10)
    location: Optional[str] = None
    notes: Optional[str] = None

class SmokingLogResponse(SmokingLogCreate):
    smoking_log_id: UUID
    user_id: UUID
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Craving Log Schemas
class CravingLogCreate(BaseModel):
    craving_level: int = Field(..., ge=0, le=10)
    stress_level: Optional[int] = Field(None, ge=0, le=10)
    mood_level: Optional[int] = Field(None, ge=0, le=10)
    trigger: Optional[str] = None
    timestamp: Optional[datetime] = None
    notes: Optional[str] = None

class CravingLogResponse(CravingLogCreate):
    craving_id: UUID
    user_id: UUID
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Daily Check-in Schemas
class DailyCheckInCreate(BaseModel):
    stress_level: Optional[int] = Field(None, ge=0, le=10)
    mood_level: Optional[int] = Field(None, ge=0, le=10)
    craving_level: Optional[int] = Field(None, ge=0, le=10)
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    smoked_today: bool
    notes: Optional[str] = None

class DailyCheckInResponse(DailyCheckInCreate):
    checkin_id: UUID
    user_id: UUID
    checkin_date: date
    created_at: datetime

    class Config:
        from_attributes = True

# ML Relapse Prediction Schemas
class RelapsePredictionCreate(BaseModel):
    craving_level: int = Field(..., ge=0, le=10)
    stress_level: int = Field(..., ge=0, le=10)
    smoke_free_days: int = Field(..., ge=0)
    previous_relapses: int = Field(..., ge=0)
    cigarettes_per_day: int = Field(..., ge=0)
    hour: int = Field(..., ge=0, le=23)
    trigger: str

class RelapsePredictionResponse(BaseModel):
    prediction_id: UUID
    risk_score: float
    risk_level: str  # LOW, MEDIUM, HIGH
    confidence_score: float
    top_factors: List[str]
    prediction_timestamp: datetime

    class Config:
        from_attributes = True

# AI Coach Chat Schemas
class AIChatRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None

class AIMessageResponse(BaseModel):
    message_id: UUID
    sender_type: str  # USER, AI
    message_text: str
    created_at: datetime

    class Config:
        from_attributes = True

class AIChatResponse(BaseModel):
    message_id: UUID
    conversation_id: UUID
    response: str
    suggested_intervention: Optional[str] = None
    risk_level: Optional[str] = None

class AIConversationResponse(BaseModel):
    conversation_id: UUID
    user_id: UUID
    started_at: datetime
    context_type: Optional[str] = None
    risk_level: Optional[str] = None
    messages: List[AIMessageResponse] = []

    class Config:
        from_attributes = True

# Intervention Schemas
class InterventionResponse(BaseModel):
    intervention_id: UUID
    title: str
    type: str
    description: Optional[str]
    duration_minutes: Optional[int]
    instructions: Optional[str]
    active: bool

    class Config:
        from_attributes = True

class InterventionSessionStart(BaseModel):
    intervention_id: UUID
    craving_id: Optional[UUID] = None

class InterventionSessionComplete(BaseModel):
    craving_before: Optional[int] = Field(None, ge=0, le=10)
    craving_after: Optional[int] = Field(None, ge=0, le=10)
    duration_seconds: Optional[int] = Field(None, ge=0)

class InterventionSessionResponse(BaseModel):
    session_id: UUID
    user_id: UUID
    intervention_id: UUID
    craving_id: Optional[UUID]
    craving_before: Optional[int]
    craving_after: Optional[int]
    duration_seconds: Optional[int]
    completed: bool
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

# Recovery Progress Schemas
class RecoveryProgressResponse(BaseModel):
    smoke_free_days: int
    current_streak: int
    longest_streak: int
    cigarettes_avoided: int
    money_saved: float
    quit_date: Optional[date]
    last_smoked_at: Optional[datetime]

    class Config:
        from_attributes = True
