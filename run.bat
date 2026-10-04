@echo off
setlocal

echo Starting FinMan Environment Check...

if not exist ".venv\" (
    echo Creating virtual environment...
    python -m venv .venv
    echo Installing dependencies...
    call .venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
) else (
    echo Virtual environment already exists.
    call .venv\Scripts\activate.bat
    :: Just to be safe, ensure they are installed in the venv
    python -m pip install -r requirements.txt >nul 2>&1
)

if not exist "finance.db" (
    echo finance.db not found. Running database seeder for demo data...
    python seed.py
) else (
    echo Database already exists. Skipping seeder.
)

echo.
echo ========================================================
echo FinMan Backend is live at http://127.0.0.1:8000/docs
echo ========================================================
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
