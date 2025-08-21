#!/usr/bin/env python
import os
import sys
import django
from django.core.management import execute_from_command_line

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'recipe_manager.settings')
    try:
        execute_from_command_line(['manage.py', 'runserver', '0.0.0.0:5000'])
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)