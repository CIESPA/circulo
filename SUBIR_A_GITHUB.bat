@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Preparando el proyecto CI.ES.PA para GitHub...
echo.
if not exist .git git init

git branch -M main
git add .
git commit -m "Sitio CI.ES.PA para Netlify" 2>nul

git remote remove origin 2>nul
git remote add origin https://github.com/CIESPA/circulo.git

echo.
echo Se abrira el inicio de sesion de GitHub si es necesario.
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo No se pudo subir automaticamente. Revisa que hayas iniciado sesion en GitHub.
  pause
  exit /b 1
)
echo.
echo Proyecto subido correctamente a https://github.com/CIESPA/circulo
echo Ahora podes conectarlo desde Netlify con Import an existing project.
pause
