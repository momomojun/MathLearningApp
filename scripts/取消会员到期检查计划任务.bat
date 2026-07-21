@echo off
chcp 65001 >nul
schtasks /delete /tn "MathAPP_会员到期检查" /f

echo.
echo 已删除每天检查会员到期的计划任务。
echo.
pause
