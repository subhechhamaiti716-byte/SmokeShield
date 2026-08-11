@echo off
echo Starting SmokeShield Frontend (Expo)...
echo.
echo Use "a" to open Android Emulator, or scan QR code with Expo Go
echo.
cd /d "%~dp0frontend"
cmd.exe /c npx expo start
