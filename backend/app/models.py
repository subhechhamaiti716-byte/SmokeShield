import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, ForeignKey, Numeric, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from datetime import datetime
from app.database import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise CHAR(36), storing as string.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value

class User(Base):
    __tablename__ = "users"

    user_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="USER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    smoking_profile = relationship("SmokingProfile", uselist=False, back_populates="user")
    smoking_logs = relationship("SmokingLog", back_populates="user", cascade="all, delete-orphan")
    craving_logs = relationship("CravingLog", back_populates="user", cascade="all, delete-orphan")
    daily_checkins = relationship("DailyCheckIn", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("RelapsePrediction", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
    intervention_sessions = relationship("InterventionSession", back_populates="user", cascade="all, delete-orphan")
    recovery_progress = relationship("RecoveryProgress", uselist=False, back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class SmokingProfile(Base):
    __tablename__ = "smoking_profiles"

    profile_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    cigarettes_per_day = Column(Integer, nullable=False)
    years_smoking = Column(Float, nullable=False)
    previous_quit_attempts = Column(Integer, default=0)
    previous_relapses = Column(Integer, default=0)
    average_cigarette_cost = Column(Float, nullable=False)
    target_quit_date = Column(Date, nullable=True)
    common_triggers = Column(JSON, nullable=True)  # Stored as a list of strings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="smoking_profile")

class SmokingLog(Base):
    __tablename__ = "smoking_logs"

    smoking_log_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    cigarettes = Column(Integer, default=1, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    trigger = Column(String(50), nullable=True)
    stress_level = Column(Integer, nullable=True)
    mood_level = Column(Integer, nullable=True)
    location = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="smoking_logs")

class CravingLog(Base):
    __tablename__ = "craving_logs"

    craving_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    craving_level = Column(Integer, nullable=False)  # 0 to 10
    stress_level = Column(Integer, nullable=True)    # 0 to 10
    mood_level = Column(Integer, nullable=True)      # 0 to 10
    trigger = Column(String(50), nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="craving_logs")
    predictions = relationship("RelapsePrediction", back_populates="craving_log", cascade="all, delete-orphan")
    intervention_sessions = relationship("InterventionSession", back_populates="craving_log")

class DailyCheckIn(Base):
    __tablename__ = "daily_checkins"

    checkin_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    checkin_date = Column(Date, nullable=False, default=datetime.utcnow)
    stress_level = Column(Integer, nullable=True)
    mood_level = Column(Integer, nullable=True)
    craving_level = Column(Integer, nullable=True)
    sleep_hours = Column(Float, nullable=True)
    smoked_today = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="daily_checkins")

class RelapsePrediction(Base):
    __tablename__ = "relapse_predictions"

    prediction_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    craving_id = Column(GUID, ForeignKey("craving_logs.craving_id", ondelete="SET NULL"), nullable=True)
    risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH
    confidence_score = Column(Float, nullable=False)
    top_factors = Column(JSON, nullable=True)  # List of strings
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="predictions")
    craving_log = relationship("CravingLog", back_populates="predictions")

class AIConversation(Base):
    __tablename__ = "ai_conversations"

    conversation_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    context_type = Column(String(50), nullable=True)  # Craving, Stress, General, Recovery
    risk_level = Column(String(20), nullable=True)

    user = relationship("User", back_populates="conversations")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")

class AIMessage(Base):
    __tablename__ = "ai_messages"

    message_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID, ForeignKey("ai_conversations.conversation_id", ondelete="CASCADE"), nullable=False)
    sender_type = Column(String(20), nullable=False)  # USER, AI
    message_text = Column(Text, nullable=False)
    model_provider = Column(String(30), nullable=True)  # Gemini, Ollama, Rule-based
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("AIConversation", back_populates="messages")

class Intervention(Base):
    __tablename__ = "interventions"

    intervention_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    title = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # Breathing, Walking, Mindfulness, Water, distraction
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    instructions = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("InterventionSession", back_populates="intervention")

class InterventionSession(Base):
    __tablename__ = "intervention_sessions"

    session_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    intervention_id = Column(GUID, ForeignKey("interventions.intervention_id", ondelete="CASCADE"), nullable=False)
    craving_id = Column(GUID, ForeignKey("craving_logs.craving_id", ondelete="SET NULL"), nullable=True)
    craving_before = Column(Integer, nullable=True)
    craving_after = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    completed = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="intervention_sessions")
    intervention = relationship("Intervention", back_populates="sessions")
    craving_log = relationship("CravingLog", back_populates="intervention_sessions")

class RecoveryProgress(Base):
    __tablename__ = "recovery_progress"

    recovery_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    smoke_free_days = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    cigarettes_avoided = Column(Integer, default=0)
    money_saved = Column(Float, default=0.0)
    quit_date = Column(Date, nullable=True)
    last_smoked_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="recovery_progress")


class Achievement(Base):
    __tablename__ = "achievements"

    achievement_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    key = Column(String(50), unique=True, nullable=False)  # e.g. FIRST_DAY, WEEK_FREE
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(10), nullable=True)  # emoji
    points = Column(Integer, default=0)
    category = Column(String(30), nullable=True)  # streak, craving, recovery
    threshold = Column(Integer, nullable=True)  # days / cravings count etc
    created_at = Column(DateTime, default=datetime.utcnow)

    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(GUID, ForeignKey("achievements.achievement_id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    notified = Column(Boolean, default=False)

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    type = Column(String(30), nullable=False)  # achievement, milestone, reminder, high_risk
    read = Column(Boolean, default=False)
    data = Column(JSON, nullable=True)  # extra payload
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
