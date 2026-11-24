@echo off
REM ChainForge - one-command launcher for Windows (CMD or PowerShell:  .\run.bat)
setlocal
cd /d "%~dp0"

REM ---- 1) find a REAL Python (the Microsoft Store "python" shortcut does not count)
set "PY="
python --version >nul 2>nul && set "PY=python"
if not defined PY ( py -3 --version >nul 2>nul && set "PY=py -3" )
if not defined PY goto :nopython
%PY% -c "import sys; sys.exit(0 if sys.version_info>=(3,9) else 1)" >nul 2>nul
if errorlevel 1 goto :nopython

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo !! Node.js is not installed. Install the LTS version from https://nodejs.org then run .\run.bat again.
  pause
  exit /b 1
)

REM ---- 2) Python virtual environment + dependency
if not exist venv\Scripts\python.exe (
  echo ^>^> Creating Python virtual environment...
  %PY% -m venv venv
)
if not exist venv\Scripts\python.exe (
  echo !! Could not create the virtual environment.
  pause
  exit /b 1
)
venv\Scripts\python.exe -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo !! pip could not install the requirements. Check your internet connection and try again.
  pause
  exit /b 1
)

REM ---- 3) data folder + demo wallets
if not exist Data mkdir Data
if not exist Data\forgecoin-account (
  copy Data\forgecoin-account.sample Data\forgecoin-account >nul
  echo ^>^> Added 2 demo wallets to Data\forgecoin-account
)

REM ---- 4) frontend packages
if not exist frontend\node_modules (
  echo ^>^> Installing frontend packages ^(one time, about 1 minute^)...
  pushd frontend
  call npm install --no-audit --no-fund
  popd
)

REM ---- 5) start API, wait until it answers, then start the website
start "ChainForge API (port 8765)" cmd /k "venv\Scripts\python.exe -m Blockchain.Api.server --port 8765"

echo ^>^> Waiting for the API to start...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 25;$i++){ try { $r=Invoke-RestMethod http://127.0.0.1:8765/api/health -TimeoutSec 1; if($r.app -eq 'chainforge'){$ok=$true;break} } catch {}; Start-Sleep 1 }; if($ok){exit 0}else{exit 1}"
if errorlevel 1 (
  echo.
  echo !! The API did not start. Look at the "ChainForge API" window for the red error text.
  echo    Common causes: port 8765 already used, or a missing Python package.
  pause
  exit /b 1
)
echo ^>^> API is up

start "ChainForge Website (port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo API    : http://127.0.0.1:8765
echo Website: http://localhost:3000  ^(opening in your browser in a few seconds^)
timeout /t 8 >nul
start http://localhost:3000
endlocal
exit /b 0

:nopython
echo.
echo !! Python 3.9 or newer was not found on this computer.
echo    1. Download Python from https://www.python.org/downloads/
echo    2. In the installer TICK "Add python.exe to PATH", then click Install Now
echo    3. Close this terminal, open a new one and run .\run.bat again
echo    (Or run:  winget install Python.Python.3.12 )
pause
exit /b 1
