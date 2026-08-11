@echo off
echo ====================================================
echo SmokeShield — Local Git Repository Initializer
echo ====================================================
echo.
echo This script will initialize a local git repository,
echo configure exclusions using the .gitignore file, and stage
echo all code files ready for your first commit.
echo.
cd /d "%~dp0"
if not exist .git (
    echo Initializing new Git repository...
    git init
) else (
    echo Git repository already initialized.
)

echo.
echo Staging files...
git add .

echo.
echo Creating initial commit...
git commit -m "Initial commit - SmokeShield full production release"

echo.
echo ====================================================
echo SUCCESS!
echo ====================================================
echo Next Steps:
echo 1. Create a empty repository on GitHub (github.com)
echo 2. Run these commands to push:
echo    git remote add origin <your-github-repo-url>
echo    git branch -M main
echo    git push -u origin main
echo ====================================================
echo.
pause
