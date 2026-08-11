@echo off
echo ====================================================
echo SmokeShield — Standalone Android APK Builder
echo ====================================================
echo.
echo This script triggers the Expo Application Services (EAS) cloud builder
echo to compile your React Native project into an installable .apk file.
echo.
echo PREREQUISITES:
echo 1. Ensure you have installed the EAS CLI: npm install -g eas-cli
echo 2. Ensure you are logged into your Expo account: eas login
echo.
set /p confirm="Do you want to start the build? (y/n): "
if /i "%confirm%" neq "y" goto end

cd /d "%~dp0frontend"
echo Initializing build...
cmd.exe /c eas build -p android --profile preview

:end
echo Build process ended.
pause
