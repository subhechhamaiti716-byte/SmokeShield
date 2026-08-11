@echo off
echo Starting SmokeShield Backend...
cd /d "%~dp0backend"
C:\Users\GEONIX\.gemini\antigravity\scratch\python-embed\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
