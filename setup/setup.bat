@echo off
setup\7z.exe x setup\setup.rar -o.\setup\build -y
if errorlevel 1 exit /b 1