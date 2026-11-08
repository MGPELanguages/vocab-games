@echo off
rem Builds the student site and serves it at http://localhost:8000/  (needs Node and Python)
node scripts\build.mjs || exit /b 1
echo.
echo Student site: http://localhost:8000/#/s/sofia
echo Press Ctrl+C to stop.
python -m http.server 8000 -d _site
