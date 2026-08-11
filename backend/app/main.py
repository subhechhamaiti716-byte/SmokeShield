from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env before anything else
load_dotenv()

from app.database import engine, Base
from app.services.ml_service import load_model
from app.routers import (
    auth, users, smoking, cravings, checkins,
    prediction, ai, interventions, recovery,
    achievements, notifications, analytics,
)

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmokeShield API",
    description="AI-Powered Smoking Cessation & Recovery Tracking Backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS – allow all origins during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers under /api/v1
PREFIX = "/api/v1"
app.include_router(auth.router,          prefix=PREFIX)
app.include_router(users.router,         prefix=PREFIX)
app.include_router(smoking.router,       prefix=PREFIX)
app.include_router(cravings.router,      prefix=PREFIX)
app.include_router(checkins.router,      prefix=PREFIX)
app.include_router(prediction.router,    prefix=PREFIX)
app.include_router(ai.router,            prefix=PREFIX)
app.include_router(interventions.router, prefix=PREFIX)
app.include_router(recovery.router,      prefix=PREFIX)
app.include_router(achievements.router,  prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(analytics.router,     prefix=PREFIX)


@app.on_event("startup")
def on_startup():
    """Load the ML model when the server starts."""
    load_model()


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "service": "SmokeShield API", "version": "2.0.0"}


@app.get("/")
def root():
    return {"message": "SmokeShield API is running. Visit /docs for Swagger UI."}
