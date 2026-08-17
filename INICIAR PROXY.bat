@echo off
title Display Hub — Proxy Local
color 0A
echo.
echo  ==========================================
echo   DISPLAY HUB - Iniciando Proxy Local...
echo  ==========================================
echo.
echo  Mantenha esta janela aberta enquanto usa
echo  a plataforma no navegador.
echo.
echo  Para encerrar: pressione Ctrl+C
echo.

"C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" "%~dp0proxy.js"

echo.
echo  Proxy encerrado.
pause
