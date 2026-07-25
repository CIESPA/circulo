@echo off
chcp 65001 >nul
title Reparar acceso a GitHub - CI.ES.PA
cd /d "%~dp0"

echo.
echo ============================================
echo   REPARAR ACCESO A GITHUB - CI.ES.PA
echo ============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git no está instalado o no está en el PATH.
    echo Instalá o actualizá Git for Windows y volvé a ejecutar este archivo.
    pause
    exit /b 1
)

echo [1/5] Configurando Git Credential Manager...
git credential-manager configure >nul 2>&1

echo [2/5] Separando credenciales por repositorio...
git config --global credential.https://github.com.useHttpPath true

echo [3/5] Eliminando la credencial anterior de GitHub...
(
  echo protocol=https
  echo host=github.com
  echo.
) | git credential-manager erase >nul 2>&1

cmdkey /delete:LegacyGeneric:target=git:https://github.com >nul 2>&1
cmdkey /delete:git:https://github.com >nul 2>&1

echo [4/5] Corrigiendo la dirección del repositorio...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/CIESPA/circulo.git

echo.
echo [5/5] Subiendo el proyecto...
echo Se abrirá GitHub en el navegador. Iniciá sesión con la cuenta
echo que tiene acceso al repositorio privado CIESPA/circulo.
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo ERROR: GitHub todavía rechazó el acceso.
    echo Verificá que la cuenta elegida sea propietaria o miembro de CIESPA
    echo y que tenga permiso de escritura sobre el repositorio circulo.
    echo.
    echo También podés cambiar temporalmente el repositorio a público,
    echo hacer la primera subida y volverlo a privado.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   PROYECTO SUBIDO CORRECTAMENTE
echo ============================================
echo.
pause
