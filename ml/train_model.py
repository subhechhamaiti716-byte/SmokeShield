import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
import joblib

# Ensure output directory exists
os.makedirs("models", exist_ok=True)

# Triggers mapping used for encoding
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

def generate_synthetic_data(num_samples=2000, random_state=42):
    np.random.seed(random_state)
    
    # Generate random features
    craving_level = np.random.uniform(0, 10, num_samples)
    stress_level = np.random.uniform(0, 10, num_samples)
    smoke_free_days = np.random.randint(0, 45, num_samples)
    previous_relapses = np.random.randint(0, 6, num_samples)
    cigarettes_per_day = np.random.randint(5, 30, num_samples)
    hour = np.random.randint(0, 24, num_samples)
    
    triggers = np.random.choice(list(TRIGGER_MAP.keys()), num_samples)
    trigger_encoded = np.array([TRIGGER_MAP[t] for t in triggers])
    
    # Relapse probability based on logical rules (stress, cravings, previous relapses increase risk, quit duration reduces risk)
    # Using sigmoid function to generate probabilities
    logit = (
        -2.5 
        + 0.45 * craving_level 
        + 0.35 * stress_level 
        - 0.08 * smoke_free_days 
        + 0.25 * previous_relapses 
        + 0.03 * cigarettes_per_day
        + 0.5 * (trigger_encoded == TRIGGER_MAP["stress"])
        + 0.4 * (trigger_encoded == TRIGGER_MAP["alcohol"])
        + 0.3 * ((hour >= 18) & (hour <= 22))  # Evening hours are higher risk
    )
    
    probability = 1 / (1 + np.exp(-logit))
    relapse = np.random.binomial(1, probability)
    
    df = pd.DataFrame({
        "craving_level": craving_level,
        "stress_level": stress_level,
        "smoke_free_days": smoke_free_days,
        "previous_relapses": previous_relapses,
        "cigarettes_per_day": cigarettes_per_day,
        "hour": hour,
        "trigger_encoded": trigger_encoded,
        "relapse": relapse
    })
    
    return df

def train_and_evaluate():
    print("Generating synthetic smoking cessation dataset...")
    df = generate_synthetic_data(num_samples=3000)
    
    X = df.drop(columns=["relapse"])
    y = df["relapse"]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print(f"Dataset summary: {len(df)} samples ({sum(y)} relapses, {len(y)-sum(y)} non-relapses)")
    
    # Define models
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    lr_model = LogisticRegression(max_iter=500, random_state=42)
    
    # Fit Random Forest
    rf_model.fit(X_train, y_train)
    rf_preds = rf_model.predict(X_test)
    rf_probs = rf_model.predict_proba(X_test)[:, 1]
    
    print("\n--- Random Forest Classifier Evaluation ---")
    print(classification_report(y_test, rf_preds))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, rf_probs):.4f}")
    
    # Fit Logistic Regression
    lr_model.fit(X_train, y_train)
    lr_preds = lr_model.predict(X_test)
    lr_probs = lr_model.predict_proba(X_test)[:, 1]
    
    print("\n--- Logistic Regression Evaluation ---")
    print(classification_report(y_test, lr_preds))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, lr_probs):.4f}")
    
    # Select best model (typically Random Forest handles non-linearities better)
    best_model = rf_model
    best_name = "RandomForest"
    best_auc = roc_auc_score(y_test, rf_probs)
    
    if roc_auc_score(y_test, lr_probs) > best_auc:
        best_model = lr_model
        best_name = "LogisticRegression"
        best_auc = roc_auc_score(y_test, lr_probs)
        
    print(f"\nSaving best model: {best_name} (ROC-AUC: {best_auc:.4f})")
    
    # Save the model
    model_path = "models/relapse_model.joblib"
    joblib.dump(best_model, model_path)
    print(f"Model saved to {model_path}")
    
    # Test loading
    loaded_model = joblib.load(model_path)
    test_prediction = loaded_model.predict_proba(X_test.iloc[[0]])[0, 1]
    print(f"Loaded model test prediction: {test_prediction:.4f}")

if __name__ == "__main__":
    train_and_evaluate()
