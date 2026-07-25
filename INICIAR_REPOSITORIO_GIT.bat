@echo off
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git no esta instalado. Instalalo desde git-scm.com y volve a ejecutar este archivo.
  pause
  exit /b 1
)
if exist .git (
  echo Esta carpeta ya es un repositorio Git.
  pause
  exit /b 0
)
git init -b main
git add .
git commit -m "Sitio inicial CI.ES.PA para Netlify"
echo.
echo Repositorio local creado. Ahora crea un repositorio vacio en GitHub,
echo copia sus dos comandos de vinculacion y ejecutalos en esta carpeta.
pause
