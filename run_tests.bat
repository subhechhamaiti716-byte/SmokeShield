@echo off
echo Running SmokeShield API Tests...
cd /d "%~dp0backend"
C:\Users\GEONIX\.gemini\antigravity\scratch\python-embed\python.exe -m pytest tests/ -v
pause
