@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0..\"
set "PYTHON=%ROOT%.venv\Scripts\python.exe"
set "MANAGE=%ROOT%manage.py"

schtasks /create /tn "MathAPP_会员到期检查" /tr "\"%PYTHON%\" \"%MANAGE%\" expire_memberships" /sc daily /st 03:00 /f

echo.
echo 已注册每天凌晨 3 点自动检查会员到期的计划任务。
echo 前提是电脑那时候是开机状态、并且你已登录。
echo 想查看、改时间或删除，可以在 Windows 搜索里打开"任务计划程序"，找 "MathAPP_会员到期检查"。
echo 也可以双击"取消会员到期检查计划任务.bat"直接删除这个任务。
echo.
pause
