#!/usr/bin/env node
// Start script for Django deployment

const { execSync } = require('child_process');

console.log('Starting Django application...');

try {
  // Run the Django server
  execSync('python manage.py runserver 0.0.0.0:8000', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}