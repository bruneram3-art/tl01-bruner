@echo off
echo Sincronizando alteracoes com o GitHub...
echo.

git add .
set /p msg="Digite a mensagem do commit (o que mudou?): "
if "%msg%"=="" set msg="Atualizacao automatica"

git commit -m "%msg%"
git push origin main

echo.
echo Sincronizacao concluida!
pause
