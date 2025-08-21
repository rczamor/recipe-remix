// Package scripts for deployment
const { execSync } = require('child_process');
const process = require('process');

const scripts = {
  build: () => {
    console.log('Running Django build steps...');
    try {
      console.log('Collecting static files...');
      execSync('python manage.py collectstatic --noinput', { stdio: 'inherit' });
      
      console.log('Running database migrations...');
      execSync('python manage.py migrate', { stdio: 'inherit' });
      
      console.log('Build completed successfully!');
    } catch (error) {
      console.error('Build failed:', error.message);
      process.exit(1);
    }
  },

  start: () => {
    console.log('Starting Django application...');
    try {
      execSync('python manage.py runserver 0.0.0.0:5000', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  },

  dev: () => {
    console.log('Starting Django development server...');
    try {
      execSync('python manage.py runserver 0.0.0.0:5000', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to start development server:', error.message);
      process.exit(1);
    }
  }
};

// Execute the script based on command line argument
const scriptName = process.argv[2];
if (scripts[scriptName]) {
  scripts[scriptName]();
} else {
  console.error(`Unknown script: ${scriptName}`);
  console.log('Available scripts: build, start, dev');
  process.exit(1);
}