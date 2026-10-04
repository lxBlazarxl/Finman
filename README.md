# FinMan

FinMan is a Generalized Household Finance Manager tailored for multi-member Indian households managing a mix of cash, UPI, and bank accounts.

## Problem Statement

Indian households often manage finances collaboratively. A single household might have multiple earners and spenders, utilizing diverse payment methods (UPI, cash, credit cards, various bank accounts). Existing personal finance apps often fail to accommodate this multi-user, multi-account reality cleanly, lacking proper Role-Based Access Control (RBAC) to differentiate between "Parents" (Admins) who need a bird's-eye view of family liquidity, and "Kids" (Members) who should only manage their own allowances. FinMan solves this by providing a unified, atomic ledger engine with strict RBAC and dynamic SMS ingestion.

## Architecture

FinMan uses a **Decoupled Client-Server Architecture**.

*   **Backend**: Python 3.10+ with **FastAPI**, **SQLAlchemy 2.0**, and **Pydantic v2**.
*   **Database**: **Single-file SQLite (`finance.db`)** — Zero external server dependencies (no Postgres daemon, no Docker required).
    *   Configured with `PRAGMA foreign_keys = ON;` for relational integrity.
    *   Configured with `PRAGMA journal_mode = WAL;` (Write-Ahead Logging) for high concurrency.
*   **Security**: Stateless **JWT** Bearer tokens + **bcrypt** password hashing + strict **Role-Based Access Control (RBAC)** (`ADMIN` vs. `MEMBER`).
*   **Testing & Docs**: Automated `pytest` suite + Native interactive Swagger UI (`/docs`).

## Quickstart

Run the entire application (including backend dependencies, virtual environment setup, and demo data seeding) with a single command:

**Windows:**
```bash
run.bat
```

**macOS/Linux:**
```bash
chmod +x run.sh
./run.sh
```

## Demo Credentials (Sharma Family)

The `run` script automatically populates a realistic database with the "Sharma Family" and their recent transactions.

*   **Rajesh Sharma (Admin / Father)**
    *   Phone: `9876543210`
    *   Password: `password123`
*   **Pooja Sharma (Member / Mother)**
    *   Phone: `9876543211`
    *   Password: `password123`
*   **Aarav Sharma (Member / Son)**
    *   Phone: `9876543212`
    *   Password: `password123`

## API Reference & Interactive Testing

Once the server is running, the complete OpenAPI documentation and interactive testing interface are available at:

**http://127.0.0.1:8000/docs**

You can use the `/docs` UI to:
1.  Authenticate using the `POST /api/v1/auth/login` endpoint (or the "Authorize" button at the top).
2.  Test SMS parsing via `POST /api/v1/transactions/parse-sms`.
3.  View personal balances via `GET /api/v1/balances/me`.
4.  (If logged in as Rajesh/Admin) View total household balance via `GET /api/v1/balances/household`.
