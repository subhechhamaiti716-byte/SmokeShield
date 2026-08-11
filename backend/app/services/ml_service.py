import os
import joblib
import pandas as pd
import numpy as np

# Trigger encoding map matching training script
TRIGGER_MAP = {
    "stress": 0,
    "coffee": 1,
    "boredom": 2,
    "social": 3,
    "alcohol": 4,
    "food": 5,
    "work": 6,
    "other": 7
}

# Load the ML model
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "ml", "models", "relapse_model.joblib"
))

model = None

def load_model():
    global model
    if model is None:
        if os.path.exists(MODEL_PATH):
            try:
                model = joblib.load(MODEL_PATH)
                print(f"Relapse prediction model loaded successfully from {MODEL_PATH}")
            except Exception as e:
                print(f"Error loading model from {MODEL_PATH}: {e}")
        else:
            print(f"Model file not found at {MODEL_PATH}. Prediction service will use fallback heuristic rules.")

def predict_relapse_risk(
    craving_level: int,
    stress_level: int,
    smoke_free_days: int,
    previous_relapses: int,
    cigarettes_per_day: int,
    hour: int,
    trigger: str
) -> dict:
    """
    Estimate relapse risk using the trained ML model.
    Falls back to heuristic rules if the model file is not available.
    """
    load_model()
    
    # Heuristic top factor extraction
    top_factors = []
    if craving_level >= 7:
        top_factors.append("High craving intensity")
    if stress_level >= 7:
        top_factors.append("Elevated stress levels")
    if smoke_free_days < 7:
        top_factors.append("Early quit phase (first week)")
    if previous_relapses >= 3:
        top_factors.append("History of multiple quit attempts")
    if trigger.lower() == "stress":
        top_factors.append("Stress trigger identified")
    if trigger.lower() == "alcohol":
        top_factors.append("Alcohol trigger (high risk situation)")
    if 18 <= hour <= 22:
        top_factors.append("Evening high-risk time window")
        
    if not top_factors:
        top_factors.append("Baseline quit monitoring")

    # If model is loaded, use it
    if model is not None:
        try:
            # Map trigger to encoded value
            trigger_lower = trigger.lower()
            trigger_enc = TRIGGER_MAP.get(trigger_lower, TRIGGER_MAP["other"])
            
            # Form DataFrame matching the feature column names
            features = pd.DataFrame([{
                "craving_level": float(craving_level),
                "stress_level": float(stress_level),
                "smoke_free_days": int(smoke_free_days),
                "previous_relapses": int(previous_relapses),
                "cigarettes_per_day": int(cigarettes_per_day),
                "hour": int(hour),
                "trigger_encoded": int(trigger_enc)
            }])
            
            # Predict probability
            prob = model.predict_proba(features)[0, 1]
            risk_score = float(prob * 100)
            
            # Confidence score calculation (based on model class prediction confidence)
            confidence = float(max(model.predict_proba(features)[0]))
            
        except Exception as e:
            print(f"Prediction failed, using fallback heuristic: {e}")
            risk_score = compute_heuristic_risk(craving_level, stress_level, smoke_free_days, previous_relapses, trigger, hour)
            confidence = 0.70
    else:
        # Fallback heuristic calculation
        risk_score = compute_heuristic_risk(craving_level, stress_level, smoke_free_days, previous_relapses, trigger, hour)
        confidence = 0.70

    # Risk level classification
    if risk_score < 35:
        risk_level = "LOW"
    elif risk_score < 70:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"
        
    return {
        "risk_score": round(risk_score, 1),
        "risk_level": risk_level,
        "confidence_score": round(confidence, 2),
        "top_factors": top_factors
    }

def compute_heuristic_risk(
    craving: int,
    stress: int,
    days: int,
    relapses: int,
    trigger: str,
    hour: int
) -> float:
    """Calculate fallback risk score using clinical rules."""
    score = 15.0  # Base risk
    score += craving * 4.5
    score += stress * 3.5
    score -= min(days * 0.8, 30.0)  # Max reduction of 24 points for long streaks
    score += relapses * 2.5
    
    if trigger.lower() == "stress":
        score += 5.0
    elif trigger.lower() == "alcohol":
        score += 8.0
        
    if 18 <= hour <= 22:
        score += 4.0
        
    # Bound score between 0 and 100
    return max(0.0, min(100.0, score))
