@echo off
chcp 65001 >nul
echo ====================================
echo   推送到 GitHub - photo-vote
echo ====================================
echo.
echo 请确保代理软件已经在运行！
echo.

set /p PROXY_PORT="请输入代理端口号 (如 7890): "

echo.
echo 正在配置 Git 代理...
git config --global http.proxy http://127.0.0.1:%PROXY_PORT%
git config --global https.proxy http://127.0.0.1:%PROXY_PORT%

echo.
echo 正在推送到 GitHub...
cd /d "D:\verba-vista-main\claude code\photo-vote"
git push -u origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo   ✅ 推送成功！
    echo   仓库地址: https://github.com/usul-ususul/photo-vote
    echo ====================================
) else (
    echo.
    echo ❌ 推送失败，请检查：
    echo   1. 代理软件是否在运行
    echo   2. 端口号是否正确
    echo   3. 尝试换个端口重试
)

pause
