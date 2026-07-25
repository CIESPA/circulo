@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Este metodo publica por CLI. Para que el panel /admin pueda guardar cambios,
echo el sitio debe estar conectado tambien a un repositorio Git.
echo.
call npm run build
if errorlevel 1 goto error
call npx netlify-cli deploy --prod --dir=dist
if errorlevel 1 goto error
echo Publicacion finalizada.
pause
exit /b 0
:error
echo.
echo Hubo un error. Copia el ultimo mensaje y envialo en el chat.
pause
