#!/bin/bash
# Start script for Django deployment

echo "Starting Django application..."

# Run the Django server
python3 manage.py runserver 0.0.0.0:8000