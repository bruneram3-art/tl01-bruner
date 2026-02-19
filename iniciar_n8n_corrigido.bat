
@echo off
echo Iniciando n8n com correcao de CORS para Industrial Predictor...
set N8N_CORS_ENABLED=true
set N8N_LICENSE_ACTIVATION_KEY=fa88555d-68e9-4735-8345-815ee81e208f
set N8N_CORS_ORIGIN=*
set NODE_FUNCTION_ALLOW_BUILTIN=*
set NODE_FUNCTION_ALLOW_EXTERNAL=*
call n8n.cmd
pause
