@echo off
title AgenMonster v1.0.0
color 0A
echo.
echo  ╔══════════════════════════════════════╗
echo  ║     🐾 AGENMONSTER v1.0.0 🐾       ║
echo  ║   Self-Evolving AI Monster Agent     ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Starting AgenMonster...
echo  Close this window to stop the app.
echo.

cd /d "K:\AgenMonster\apps\desktop"
set PATH=C:\Users\Asus\.cargo\bin;C:\Program Files\nodejs;%PATH%

npx tauri dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] AgenMonster failed to start.
    echo Make sure Node.js and Rust are installed.
    pause
)
