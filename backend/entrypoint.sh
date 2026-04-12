#!/bin/bash
set -e

# ── Database migrations ───────────────────────────────────────────────────────
echo "Running database migrations..."
alembic upgrade head

# ── Seed roles and permissions ────────────────────────────────────────────────
echo "Seeding roles and permissions..."
python scripts/seed_roles.py

# ── Create admin user if none exists ─────────────────────────────────────────
echo "Ensuring admin user exists..."
python scripts/create_admin.py

# ── Seed test users (employee, doc manager, security officer) ─────────────────
echo "Seeding test users..."
python scripts/seed_test_users.py

# ── Ollama availability check ─────────────────────────────────────────────────
OLLAMA_URL="${OLLAMA_BASE_URL:-http://host.docker.internal:11434}"
REQUIRED_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"

echo ""
echo "Checking Ollama at ${OLLAMA_URL}..."

OLLAMA_OK=false
for i in $(seq 1 10); do
    if curl -s --max-time 3 "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
        OLLAMA_OK=true
        break
    fi
    echo "  Waiting for Ollama... (attempt ${i}/10)"
    sleep 3
done

if [ "$OLLAMA_OK" = true ]; then
    echo "  Ollama is running."

    # Check if the required model is available
    TAGS=$(curl -s "${OLLAMA_URL}/api/tags" 2>/dev/null || echo "{}")
    if echo "$TAGS" | grep -q "${REQUIRED_MODEL}"; then
        echo "  Model '${REQUIRED_MODEL}' is ready."
    else
        echo ""
        echo "  ╔══════════════════════════════════════════════════════════════╗"
        echo "  ║  WARNING: Model '${REQUIRED_MODEL}' is NOT found in Ollama. ║"
        echo "  ║  Chat will not work until you pull it.                       ║"
        echo "  ║                                                              ║"
        echo "  ║  Run this command on your machine:                           ║"
        echo "  ║    ollama pull ${REQUIRED_MODEL}                             ║"
        echo "  ╚══════════════════════════════════════════════════════════════╝"
        echo ""
    fi
else
    echo ""
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║  WARNING: Ollama is NOT running or not reachable.            ║"
    echo "  ║  Chat features will NOT work.                                ║"
    echo "  ║                                                              ║"
    echo "  ║  To fix:                                                     ║"
    echo "  ║    1. Install Ollama from https://ollama.com                 ║"
    echo "  ║    2. Run: ollama pull ${REQUIRED_MODEL}                     ║"
    echo "  ║    3. Make sure Ollama is running before using Chat.         ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo ""
fi

# ── Start application ─────────────────────────────────────────────────────────
echo "Starting SecureDoc-RAG..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
