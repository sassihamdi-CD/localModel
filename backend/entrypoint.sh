#!/bin/bash
set -e

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Run seed scripts
echo "Seeding roles and permissions..."
python scripts/seed_roles.py

# Create admin user if none exists
echo "Ensuring admin user exists..."
python scripts/create_admin.py

# Start the application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
