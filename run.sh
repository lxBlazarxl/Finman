#!/bin/bash
set -e

echo "Starting FinMan Environment Check..."

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    echo "Installing dependencies..."
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "Virtual environment already exists."
    source .venv/bin/activate
fi

if [ ! -f "finance.db" ]; then
    echo "finance.db not found. Running database seeder for demo data..."
    python seed.py
else
    echo "Database already exists. Skipping seeder."
fi

if [ ! -d "frontend/dist" ]; then
    if command -v npm &> /dev/null; then
        echo "Building frontend assets for UI dashboard..."
        (cd frontend && npm install && npm run build)
    else
        echo "Note: npm not found. Frontend static assets will not be built automatically."
    fi
fi

echo ""
echo "========================================================"
echo "FinMan App is live at:     http://127.0.0.1:8000"
echo "Interactive API Docs at:   http://127.0.0.1:8000/docs"
echo "========================================================"
echo ""

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
