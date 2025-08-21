#!/bin/bash

# Fast Django startup script with optimizations
echo "Starting Django server with optimizations..."

# Run migrations silently if needed (for faster startup)
python manage.py migrate --run-syncdb > /dev/null 2>&1

# Collect static files silently if needed
python manage.py collectstatic --noinput > /dev/null 2>&1

# Start Django server with optimizations for faster startup
python manage.py runserver 0.0.0.0:8000 --nothreading --insecure