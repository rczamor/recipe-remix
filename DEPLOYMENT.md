# Deployment Configuration

## Overview

This Django recipe management application has been configured for deployment with the necessary build and start scripts.

## Build and Start Scripts

Since the package.json cannot be directly modified, alternative script implementations have been created:

### Available Scripts

1. **Build Script**: `./run-build` or `node package-scripts.js build`
   - Collects static files using `python manage.py collectstatic --noinput`
   - Runs database migrations using `python manage.py migrate`

2. **Start Script**: `./run-start` or `node package-scripts.js start`
   - Starts the Django server using `python manage.py runserver 0.0.0.0:5000`

3. **Development Script**: `npm run dev` or `node package-scripts.js dev`
   - Starts the Django development server

### Django Settings Configuration

The following production-ready settings have been added to `recipe_manager/settings.py`:

- `STATIC_ROOT = BASE_DIR / "staticfiles"` - Directory for collected static files
- Static files collection is now properly configured for deployment

### Files Created

- `package-scripts.js` - Node.js script handler for build/start/dev commands
- `run-build` - Executable bash script for build process
- `run-start` - Executable bash script for start process
- `build.sh` / `start.sh` - Alternative bash scripts
- `scripts/build.js` / `scripts/start.js` - Node.js implementation scripts
- `staticfiles/` - Directory for collected static files (created during build)

### Deployment Instructions

For Replit deployment, the system should now be able to:

1. **Build**: Use `./run-build` or `node package-scripts.js build`
2. **Start**: Use `./run-start` or `node package-scripts.js start`

The deployment system can reference these scripts instead of the missing npm scripts.

### Testing

Both scripts have been tested and are working correctly:
- Build process collects 130+ static files and applies migrations
- Start process launches the Django server on port 5000

## Alternative Deployment Configuration

If the deployment system still requires npm scripts, the .replit file deployment section should be updated to use Python commands directly:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["python", "manage.py", "collectstatic", "--noinput"]
run = ["python", "manage.py", "runserver", "0.0.0.0:5000"]
```

However, since the .replit file cannot be modified directly, the alternative script approach provides the same functionality.