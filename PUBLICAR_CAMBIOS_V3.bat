@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo [1/4] Compilando el sitio...
call npm run build
if errorlevel 1 goto error

echo [2/4] Preparando cambios para Git...
git add .

echo [3/4] Creando commit...
git commit -m "Actualiza biografia, sinopsis y correos"
if errorlevel 1 (
  echo No habia cambios nuevos para confirmar o el commit ya existe.
)

echo [4/4] Subiendo a GitHub...
git push
if errorlevel 1 goto error

echo.
echo Cambios subidos. Netlify iniciara el despliegue automaticamente.
pause
exit /b 0

:error
echo.
echo El proceso se detuvo. Revisa el mensaje de error anterior.
pause
exit /b 1
