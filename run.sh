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

echo ""
echo "========================================================"
echo "FinMan Backend is live at http://127.0.0.1:8000/docs"
echo "========================================================"
echo ""

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
