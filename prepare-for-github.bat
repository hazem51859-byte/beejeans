@echo off
echo ============================================
echo   Preparing for GitHub Upload
echo ============================================
echo.

echo This will initialize Git and prepare the project
echo for uploading to GitHub.
echo.
pause

echo [1/3] Initializing Git...
git init

echo.
echo [2/3] Adding all files...
git add .

echo.
echo [3/3] Creating initial commit...
git commit -m "Initial commit - Bee Jeans POS System"

echo.
echo ============================================
echo   Git Repository Ready!
echo ============================================
echo.
echo Next Steps:
echo 1. Go to: https://github.com/new
echo 2. Create a new repository named: bee-jeans-pos
echo 3. Run these commands:
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/bee-jeans-pos.git
echo    git branch -M main
echo    git push -u origin main
echo.
pause
