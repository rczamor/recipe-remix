#!/usr/bin/env node
// Build script for Django deployment

const { execSync } = require('child_process');

console.log('Running Django build steps...');

try {
  // Collect static files
  console.log('Collecting static files...');
  execSync('python manage.py collectstatic --noinput', { stdio: 'inherit' });
  
  // Run database migrations
  console.log('Running database migrations...');
  execSync('python manage.py migrate', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}