@echo off
setlocal
set "SRC=%~dp0EffectsLite"
set "DST=%APPDATA%\Adobe\CEP\extensions\EffectsLite"
if not exist "%SRC%\CSXS\manifest.xml" (echo Cannot find EffectsLite folder next to this script. & pause & exit /b 1)
echo Installing to %DST%
if exist "%DST%" rmdir /s /q "%DST%"
xcopy "%SRC%" "%DST%\" /e /i /q /y >nul
if errorlevel 1 (echo Copy failed. & pause & exit /b 1)
for %%V in (9 10 11 12) do reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
echo.
echo Done. Restart After Effects, then open Window ^> Extensions ^> EffectsLite.
pause
