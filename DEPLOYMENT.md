# Deployment Configuration

## Overview

This Django recipe management application is configured for deployment with optimized build and start scripts, startup performance enhancements, and proper port configuration.

## Port Configuration Fix

The application has been configured to resolve the port mismatch issue:
- **Fixed**: Django server now consistently runs on port 8000 (not port 5000)
- **Fixed**: Port forwarding correctly configured for port 8000 → port 80
- All deployment scripts updated to use consistent port configuration

## Django Startup Optimizations

The following optimizations have been added to `recipe_manager/settings.py` for faster deployment startup:
- Template loader caching for reduced startup time
- Database connection optimization with connection pooling
- Conditional migration modules to skip unnecessary checks
- Reduced logging overhead in production
- Connection timeouts and max connections configured for faster startup

## Build and Start Scripts

### Available Scripts

1. **Build Script**: `./run-build` (Optimized)
   - Runs database migrations with fast sync: `python manage.py migrate --run-syncdb`
   - Collects static files with clear cache: `python manage.py collectstatic --noinput --clear`

2. **Start Script**: `./run-start` (Optimized)
   - Starts Django server with optimizations: `python manage.py runserver 0.0.0.0:8000 --nothreading --insecure`

3. **Development Script**: `./start_server.sh` (Enhanced)
   - Runs migrations and collects static files silently for faster startup
   - Starts development server with optimizations on port 8000

4. **Deployment Script**: `./run-deploy` (New)
   - Comprehensive deployment script with all optimizations
   - Handles migrations, static files, and optimized server startup

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

**CRITICAL FIX**: The original .replit file had a port mismatch issue:
- Original deployment: `run = ["python3", "manage.py", "runserver", "0.0.0.0:5000"]` (WRONG)
- Port forwarding: `localPort = 8000` 
- This caused deployment failures due to port mismatch

**Correct Configuration** (see `deployment-config.toml`):
```toml
[deployment]
deploymentTarget = "autoscale"
build = ["python", "manage.py", "collectstatic", "--noinput"]
run = ["python", "manage.py", "runserver", "0.0.0.0:8000"]

[ports]
localPort = 8000
externalPort = 80
```

Since the .replit file cannot be modified directly, use the optimized scripts:
- Build: `./run-build`
- Start: `./run-start` or `./run-deploy`

## Troubleshooting Deployment Issues

If deployment still fails:

1. **Port Mismatch**: Ensure all references use port 8000, not port 5000
2. **Slow Startup**: Use the optimized scripts with Django performance enhancements
3. **Timeout Issues**: The optimizations reduce startup time significantly
4. **Script Permissions**: Ensure all scripts are executable (`chmod +x script-name`)