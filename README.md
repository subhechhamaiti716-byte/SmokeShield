# SmokeShield 🛡️

SmokeShield is a comprehensive, production-ready AI-powered smoking cessation and recovery tracking application. It integrates a **FastAPI backend**, a **Scikit-learn/XGBoost relapse risk predictor**, a state-of-the-art **Gemini AI coach**, and a cross-platform **React Native (Expo)** mobile application.

---

## 🚀 Key Features

* **JWT-Based Authentication**: Secure account registration, login, and secure store token retention.
* **Onboarding & Profile Setup**: Customizable targets (cigarettes per day, quit date, average cost, triggers).
* **Relapse Predictor ML Model**: Real-time relapse risk assessment based on stress, craving level, and historic trends (yielding **0.868 ROC-AUC**).
* **Dynamic AI Coach**: Instant conversational support using **Gemini 2.0 Flash** with rule-based and Ollama fallbacks.
* **10 Custom Screens**: Complete tracking logs (cravings, smoking count, daily check-ins), detailed charts (no heavy dependencies), box breathing animation, levels, and unlocked achievements dashboard.
* **Push Notifications**: Auto-triggered notification alerts on achievements, milestone progress, and stress checks.

---

## 🛠️ Architecture

```
smokeshield/
├── backend/                  # FastAPI Web Server
│   ├── app/
│   │   ├── routers/          # 12 REST API router groups
│   │   ├── services/         # ML predictor & Gemini AI service
│   │   └── main.py           # Server launch file
│   └── requirements.txt
├── ml/                       # Machine Learning Codebase
│   ├── train_model.py        # Model training script
│   └── models/               # Serialized classifier models
└── frontend/                 # Expo React Native App
    ├── src/app/              # Main routing & application entry
    ├── src/components/       # UI screens & functional modules
    └── app.json              # Compilation rules
```

---

## 🏁 Quick Start (Local Run)

### 1. Run the Backend
```bash
# Double-click or run:
start_backend.bat

# Or manually:
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Swagger UI will be active at: `http://localhost:8000/docs`

### 2. Run the Mobile App (Expo)
```bash
# Double-click or run:
start_frontend.bat

# Or manually:
cd frontend
npx expo start
```
Scan the QR code using the **Expo Go** application on your iOS or Android device.

---

## ⚡ Deployment & Production Setup

### Cloud Backend
1. Deploy the `backend/` folder to **Render**, **Fly.io**, or **Heroku**.
2. Connect a managed PostgreSQL database (e.g. from **Supabase** or **Neon**).
3. Set your production environment variables:
   * `DATABASE_URL`: `postgresql://your-db-credentials`
   * `GEMINI_API_KEY`: `your-google-ai-studio-key`
   * `SECRET_KEY`: `your-jwt-signing-secret`

### Mobile APK Build
1. Log in or create an account with EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Build your Android APK:
   ```bash
   cd frontend
   eas build -p android --profile preview
   ```
3. Once the build completes, download and install the `.apk` on your phone!
