@echo off
cd /d "%~dp0.."

echo 正在启动后端...
start "MathAPP 后端" powershell -NoExit -ExecutionPolicy Bypass -Command ".\.venv\Scripts\Activate.ps1; python manage.py migrate; python manage.py runserver 127.0.0.1:8000"

timeout /t 3 /nobreak >nul

echo 正在启动前端...
start "MathAPP 前端" powershell -NoExit -ExecutionPolicy Bypass -Command ".\scripts\start-frontend.ps1"

timeout /t 4 /nobreak >nul

start "" "http://127.0.0.1:5173/"
