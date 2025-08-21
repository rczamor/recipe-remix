# Deployment Configuration

## Overview

This Django recipe management application is configured for deployment with optimized build and start scripts.

## Build and Start Scripts

### Available Scripts

1. **Build Script**: `./run-build`
   - Collects static files using `python manage.py collectstatic --noinput`
   - Runs database migrations using `python manage.py migrate`

2. **Start Script**: `./run-start`
   - Starts the Django server using `python manage.py runserver 0.0.0.0:8000`

3. **Development Script**: `./start_server.sh`
   - Starts the Django development server on port 8000

### Django Settings Configuration

The following production-ready settings have been configured in `recipe_manager/settings.py`:

- `STATIC_ROOT = BASE_DIR / "staticfiles"` - Directory for collected static files
- Static files collection is properly configured for deployment

### Project Structure

- `run-build` - Executable bash script for build process
- `run-start` - Executable bash script for start process
- `start_server.sh` - Development server script
- `staticfiles/` - Directory for collected static files (created during build)

### Deployment Instructions

For Replit deployment:

1. **Build**: Use `./run-build`
2. **Start**: Use `./run-start`

### Port Configuration

All scripts are configured to use port 8000 consistently:
- Django server runs on `0.0.0.0:8000`
- Port forwarding configured to forward port 8000 to external port 80

## Alternative Deployment Configuration

If the deployment system still requires npm scripts, the .replit file deployment section should be updated to use Python commands directly:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["python", "manage.py", "collectstatic", "--noinput"]
run = ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

However, since the .replit file cannot be modified directly, the alternative script approach provides the same functionality.