#!/usr/bin/env bash
# ChainForge - one-command launcher for Linux / macOS / Git Bash.
#   ./run.sh          -> installs everything (first time only) and starts API + website
set -e
cd "$(dirname "$0")"

PY=python3; command -v python3 >/dev/null 2>&1 || PY=python
command -v "$PY" >/dev/null 2>&1 || { echo "Python 3.9+ is required"; exit 1; }
command -v npm   >/dev/null 2>&1 || { echo "Node.js 18+ (with npm) is required"; exit 1; }

# 1) Python virtual environment + dependency
if [ ! -d venv ]; then
  echo ">> Creating Python virtual environment..."
  "$PY" -m venv venv
fi
if [ -x venv/bin/python ]; then VPY=venv/bin/python; else VPY=venv/Scripts/python.exe; fi
"$VPY" -m pip install -q -r requirements.txt

# 2) Data folder + two demo wallets (only if you do not have wallets yet)
mkdir -p Data
if [ ! -f Data/forgecoin-account ]; then
  cp Data/forgecoin-account.sample Data/forgecoin-account
  echo ">> Added 2 demo wallets to Data/forgecoin-account"
fi

# 3) Frontend dependencies
if [ ! -d frontend/node_modules ]; then
  echo ">> Installing frontend packages (one time, ~1 minute)..."
  (cd frontend && npm install --no-audit --no-fund)
fi

# 4) Start backend (port 8765) + frontend (port 3000)
"$VPY" -m Blockchain.Api.server --port 8765 &
API_PID=$!
trap 'echo; echo "Stopping..."; kill $API_PID 2>/dev/null' EXIT INT TERM

# wait (max 20 s) until the API answers, so the website never starts without a backend
ok=0
for i in $(seq 1 20); do
  if "$VPY" -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:8765/api/health',timeout=1)" >/dev/null 2>&1; then ok=1; break; fi
  kill -0 $API_PID 2>/dev/null || break
  sleep 1
done
if [ "$ok" != "1" ]; then
  echo "!! The API did not start. Read the error above (port 8765 busy? missing package?)"; exit 1
fi
echo ">> API is up"

echo ">> API   : http://127.0.0.1:8765"
echo ">> Website: http://localhost:3000   (open this in your browser)"
cd frontend && npm run dev
