#!/bin/bash
# Build script for Django deployment

echo "Running Django build steps..."

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Run database migrations
echo "Running database migrations..."
python manage.py migrate

echo "Build completed successfully!"