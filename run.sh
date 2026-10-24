#!/bin/bash
set -e

# --- Network binding ------------------------------------------------------
# Default matches the original behaviour: reachable from other devices on
# your network. Pass --local to restrict the app to this machine only.
HOST="0.0.0.0"
BIND_CHOSEN=""

usage() {
    cat <<'EOF'
Usage: ./run.sh [--lan | --local]

  --lan, --all-interfaces   Listen on 0.0.0.0 so other devices on your
                            network can connect (default).
  --local, --localhost      Listen on 127.0.0.1 so only this machine can
                            connect.
  -h, --help                Show this help.

With no flag, the script asks once (if run interactively).
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --lan|--all-interfaces) HOST="0.0.0.0"; BIND_CHOSEN="1" ;;
        --local|--localhost)    HOST="127.0.0.1"; BIND_CHOSEN="1" ;;
        -h|--help)              usage; exit 0 ;;
        *) echo "Unknown option: $1"; echo; usage; exit 1 ;;
    esac
    shift
done

echo "Starting FinMan Environment Check..."

# Ask once when no flag was given. Non-interactive runs (CI, piped input)
# keep the 0.0.0.0 default so behaviour never changes silently.
if [ -z "$BIND_CHOSEN" ] && [ -t 0 ]; then
    echo ""
    echo "Who should be able to reach the app?"
    echo "  1) This network  - other devices (phones, tablets) can connect  [default]"
    echo "  2) This machine  - only http://127.0.0.1 on this computer"
    printf "Choose [1/2]: "
    read -r bind_choice || bind_choice=""
    case "$bind_choice" in
        2|local|localhost|l) HOST="127.0.0.1" ;;
        1|lan|all|a|"") HOST="0.0.0.0" ;;
        *) echo "Unrecognised choice '$bind_choice'. Using this network (0.0.0.0)."
           HOST="0.0.0.0" ;;
    esac
    echo ""
fi

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
    # Keep pinned dependency versions in sync with requirements.txt
    python -m pip install -q -r requirements.txt
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

if [ "$HOST" = "0.0.0.0" ]; then
    # Best-effort LAN address so the printed URL is actually usable elsewhere.
    LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
    if [ -z "$LAN_IP" ]; then
        LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
    fi

    echo ""
    echo "========================================================"
    echo "FinMan App is live at:     http://127.0.0.1:8000"
    if [ -n "$LAN_IP" ]; then
        echo "Reachable on your network: http://$LAN_IP:8000"
    fi
    echo "Interactive API Docs at:   http://127.0.0.1:8000/docs"
    echo "Binding: all interfaces ($HOST) - other devices can connect."
    echo "========================================================"
    echo ""
else
    echo ""
    echo "========================================================"
    echo "FinMan App is live at:     http://127.0.0.1:8000"
    echo "Interactive API Docs at:   http://127.0.0.1:8000/docs"
    echo "Binding: this machine only ($HOST)."
    echo "========================================================"
    echo ""
fi

python3 -m uvicorn app.main:app --host "$HOST" --port 8000 --reload
