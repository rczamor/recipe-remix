#!/bin/bash
# Start script for Django deployment

echo "Starting Django application..."

# Run the Django server with --noreload flag to avoid StatReloader issues
python3 manage.py runserver --noreload 0.0.0.0:8000