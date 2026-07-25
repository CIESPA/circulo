@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] Generando el sitio estatico...
call npm run build
if errorlevel 1 goto error
echo [2/2] Abriendo vista previa local...
echo Se abrira en http://localhost:3000
call npx serve dist
exit /b 0
:error
echo.
echo Hubo un error. Copia el ultimo mensaje y envialo en el chat.
pause
