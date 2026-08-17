@echo off
title Display Hub — Servidor Local
color 0A
echo.
echo  ==========================================
echo   DISPLAY HUB - Iniciando servidor...
echo  ==========================================
echo.
echo  O navegador abrira automaticamente em:
echo  http://localhost:3131
echo.
echo  Mantenha esta janela aberta enquanto
echo  usa a plataforma.
echo.
echo  Para encerrar: feche esta janela ou
echo  pressione Ctrl+C
echo.

"C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" "%~dp0servidor.js"

echo.
echo  Servidor encerrado.
pause
