import os
import time
import json
import httpx
from typing import Optional

# Retrieve API keys and service URLs from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")

def generate_coach_response(
    user_message: str,
    full_name: str,
    cigarettes_per_day: int,
    risk_level: str,
    risk_score: float,
    top_factors: list,
    trigger: Optional[str] = None,
    previous_interventions: Optional[list] = None
) -> dict:
    """
    Generate a supportive, context-aware AI Coach response.
    Primary: Gemini API
    Backup 1: Ollama (local LLM)
    Backup 2: Rule-based fallback
    """
    prompt = build_coach_prompt(
        user_message, full_name, cigarettes_per_day, risk_level, risk_score, top_factors, trigger, previous_interventions
    )
    
    # 1. Attempt Gemini API
    # 1. Attempt Gemini API with retries
    if GEMINI_API_KEY:
        for attempt in range(3):
            try:
                from google import genai as google_genai
                client = google_genai.Client(api_key=GEMINI_API_KEY)
                response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=prompt,
                    config=google_genai.types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                data = json.loads(response.text.strip())
                return {
                    "response": data.get("response", "Stay strong, you can do this!"),
                    "suggested_intervention": data.get("suggested_intervention"),
                    "model_provider": "Gemini"
                }
            except Exception as e:
                # If overload or any error, retry after short pause
                if "overload" in str(e).lower() or "429" in str(e):
                    time.sleep(2 ** attempt)  # exponential backoff
                    continue
                else:
                    # break on other errors to fallback to Ollama
                    break
            
    # 2. Attempt Ollama Local LLM
    try:
        ollama_payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt + "\nRespond ONLY with a valid JSON object matching the format specified.",
            "stream": False,
            "options": {"temperature": 0.7}
        }
        # Run a short timeout to prevent blocking FastAPI request
        with httpx.Client(timeout=60.0) as client:
            response = client.post(OLLAMA_API_URL, json=ollama_payload)
            if response.status_code == 200:
                result_text = response.json().get("response", "").strip()
                # Find JSON bounds if model output includes extra text
                start_idx = result_text.find("{")
                end_idx = result_text.rfind("}")
                if start_idx != -1 and end_idx != -1:
                    json_str = result_text[start_idx:end_idx+1]
                    data = json.loads(json_str)
                    return {
                        "response": data.get("response", "Keep going! One minute at a time."),
                        "suggested_intervention": data.get("suggested_intervention"),
                        "model_provider": "Ollama"
                    }
    except Exception as e:
        print(f"Ollama local LLM execution failed: {e}. Using rule-based fallback...")
        
    # 3. Final Rule-based Fallback
    return get_rule_based_fallback(user_message, risk_level, trigger)

def build_coach_prompt(
    user_message: str,
    full_name: str,
    cigarettes_per_day: int,
    risk_level: str,
    risk_score: float,
    top_factors: list,
    trigger: Optional[str],
    previous_interventions: Optional[list]
) -> str:
    """Build a detailed system instructions and user context prompt."""
    factors_str = ", ".join(top_factors) if top_factors else "None detected"
    interventions_str = ", ".join(previous_interventions) if previous_interventions else "None recorded yet"
    trigger_str = trigger if trigger else "general cravings"
    
    return f"""You are SmokeShield AI Coach, an empathetic, supportive, and scientifically grounded smoking cessation counselor.
The user's name is {full_name}.
Current user context:
- Normal daily cigarettes: {cigarettes_per_day}
- Current estimated relapse risk: {risk_score}/100 ({risk_level} risk)
- Top risk factors contributing to this prediction: {factors_str}
- Current trigger: {trigger_str}
- Previously helpful activities: {interventions_str}

The user says: "{user_message}"

Provide a conversational, warm, and highly supportive response (maximum 3 sentences) that validates their feelings and suggests a direct, actionable coping mechanism. Do NOT offer medical diagnoses.

You MUST respond strictly in the following JSON format:
{{
  "response": "Your supportive message here, tailored to their current trigger and risk factors.",
  "suggested_intervention": "breathing"
}}

The "suggested_intervention" value MUST be one of the following strings, or null if no intervention is recommended:
- "breathing" (best for stress, high anxiety, evening craving)
- "walking" (best for restlessness, work pressure, physical craving)
- "mindfulness" (best for mood issues, boredom, emotional trigger)
- "water" (best for physical mouth-feel cravings, after-meal cravings)
- "distraction" (best for boredom, routine triggers like coffee/alcohol)
- "journaling" (best for self-reflection, understanding patterns)
- "support_contact" (best for extreme risk/close to relapse)
"""

def get_rule_based_fallback(user_message: str, risk_level: str, trigger: Optional[str]) -> dict:
    """Generate static supportive messages based on risk and triggers."""
    trigger_lower = trigger.lower() if trigger else ""
    
    if risk_level == "HIGH":
        if "stress" in trigger_lower or "work" in trigger_lower:
            response = "I hear you, and it's completely normal to feel this craving when stress is high. Let's take a deep breath. A quick breathing exercise can help calm your nervous system right now."
            intervention = "breathing"
        elif "alcohol" in trigger_lower or "social" in trigger_lower:
            response = "Social environments can trigger strong cravings. You've come so far—don't let a temporary craving reset your progress. Let's try to distract your mind for a few minutes."
            intervention = "distraction"
        else:
            response = "Your craving is running high right now. Remember why you decided to quit. Let's interrupt this impulse together with a short breathing exercise."
            intervention = "breathing"
    elif risk_level == "MEDIUM":
        if "boredom" in trigger_lower:
            response = "Boredom is a very common trigger. Your brain is looking for a quick hit of dopamine. Let's try a short mindfulness exercise to reset your focus."
            intervention = "mindfulness"
        elif "coffee" in trigger_lower or "food" in trigger_lower:
            response = "Pairing smoking with coffee or meals is a strong habit. Let's break that association by drinking a cold glass of water and taking a step back."
            intervention = "water"
        else:
            response = "You're doing great, but a craving is starting to build. Let's redirect your energy. How about a 5-minute walk to clear your head?"
            intervention = "walking"
    else:
        # LOW risk
        response = "You are in a low risk zone, which is fantastic! Take a moment to write down what is helping you succeed today, or log your progress in your journal."
        intervention = "journaling"
        
    return {
        "response": response,
        "suggested_intervention": intervention,
        "model_provider": "Rule-based Fallback"
    }
