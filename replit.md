# Recipe Remix Application

## Overview

Recipe Remix is a full-stack family recipe management web application built with Django and PostgreSQL. The application allows authenticated users to manage their family's recipe collection, including scraping recipes from URLs, storing them in structured format, rating recipes, cloning and modifying them, generating shopping lists based on ingredients, and tracking revision history for each recipe. The app features user authentication, family group management with invitation system, and an elegant, user-friendly interface built with Tailwind CSS and vanilla JavaScript.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology**: Vanilla JavaScript with modern ES6+ features
- **UI Framework**: Tailwind CSS for responsive design and styling
- **Icons**: Font Awesome for consistent iconography
- **Interactivity**: DOM manipulation with event handling and dynamic content rendering
- **API Communication**: Fetch API for RESTful backend communication
- **Navigation**: Page-based navigation with dedicated recipe detail pages

### Backend Architecture
- **Framework**: Django 5.2.4 with Python 3.11
- **Database**: PostgreSQL with native Django ORM
- **Web Scraping**: BeautifulSoup4 and requests for HTML parsing and recipe extraction
- **Session Management**: Django sessions for anonymous user rating system
- **API**: Django REST views with JSON responses

### Project Structure
```
├── recipe_manager/          # Django project configuration
│   ├── settings.py         # Django settings and configuration
│   ├── urls.py            # Main URL routing configuration
│   └── wsgi.py            # WSGI application for deployment
├── recipes/                # Main Django application
│   ├── models.py          # Database models (Recipe, Ingredient, etc.)
│   ├── views.py           # API endpoints and view functions
│   ├── urls.py            # App-specific URL routing
│   ├── services.py        # Web scraping and business logic
│   ├── admin.py           # Django admin configuration
│   └── templates/         # HTML templates
├── static/                 # Static files (CSS, JavaScript, images)
│   └── js/app.js          # Frontend JavaScript application
└── manage.py              # Django management script
```

## Key Components

### Database Schema (Django Models)
- **Recipe**: Core recipe data including title, description, image, prep/cook times, servings, ratings, and clone relationships
- **Ingredient**: Recipe ingredients with quantity, name, brand, price, and ordering
- **Instruction**: Step-by-step cooking instructions with description, timing, and ordering  
- **Rating**: User ratings for recipes using session-based anonymous rating system
- **RecipeRevision**: Complete revision history for each recipe, storing snapshots of all recipe data with change summaries

### Backend Services (Django Views & Services)
- **Recipe Management**: Full CRUD operations with search functionality
- **Web Scraping**: Automatic recipe extraction from URLs using BeautifulSoup4, supporting JSON-LD structured data and HTML parsing
- **Rating System**: Anonymous session-based recipe rating with automatic average calculation
- **Shopping Lists**: Dynamic ingredient aggregation with cost calculation
- **Recipe Cloning**: Full recipe duplication with editing capabilities
- **Revision History**: Automatic tracking of all recipe changes with detailed snapshots and change summaries
- **Recipe Cleaning Service**: AI-powered recipe data cleaning using Grok LLM via Langchain
  - Fixes spelling and grammar errors in descriptions
  - Standardizes ingredient formats (e.g., "1 tsp" instead of "1 teaspoon")
  - Makes instructions clear and concise
  - Removes promotional content or irrelevant information
  - Toggleable during recipe import (enabled by default)

### Frontend Features (Vanilla JavaScript)
- **Recipe Grid**: Responsive card-based recipe display with ratings and metadata
- **Recipe Details Pages**: Dedicated pages for each recipe with URL pattern /recipe/{recipe_id}
  - 3-column grid layout: ingredients (1 column), instructions (2 columns)
  - Image gallery at the top
  - Ratings, date created, cook time, and servings displayed under title
- **Meal Planning Calendar**: Toggle between recipe grid and calendar view using the calendar icon button in header
  - Drag and drop recipes onto specific days and meal slots (breakfast, lunch, dinner, snack)
  - Weekly view with navigation between weeks
  - Generate shopping lists from weekly meal plans
- **Add Recipe Modal**: URL-based recipe import with real-time scraping feedback
- **Shopping List Sidebar**: Dynamic ingredient aggregation with pricing and management
- **Rating System**: Interactive star-based rating with immediate feedback
- **Revision History Modal**: View all recipe revisions with detailed change information and timestamps

## Data Flow

1. **Recipe Import**: User provides URL → Backend scrapes recipe data → Stores in database → Returns structured recipe
2. **Recipe Display**: Frontend queries recipes → Backend retrieves from database → Renders in card grid
3. **Recipe Rating**: User rates recipe → Backend updates rating and recalculates average → UI reflects new rating
4. **Shopping List**: User selects ingredients → Frontend aggregates selections → Backend calculates totals
5. **Recipe Cloning**: User clones recipe → Frontend opens editing modal → Backend creates new recipe with modifications

## External Dependencies

### Core Dependencies
- **Django**: Modern Python web framework for rapid development
- **PostgreSQL**: Robust relational database with Django ORM integration
- **BeautifulSoup4**: HTML parsing library for web scraping
- **requests**: HTTP library for making web requests
- **psycopg2-binary**: PostgreSQL database adapter for Python
- **python-decouple**: Environment variable management
- **Pillow**: Image processing library for Django

### Frontend Dependencies
- **Tailwind CSS**: Utility-first CSS framework via CDN
- **Font Awesome**: Icon library via CDN
- **Vanilla JavaScript**: Modern ES6+ for dynamic functionality

## Deployment Strategy

### Development
- **Application**: Django development server on port 8000
- **Database**: PostgreSQL with Django ORM and migrations
- **Static Files**: Served directly by Django during development
- **Hot Reload**: Django auto-reloads on code changes

### Production
- **WSGI Server**: Production-ready Django deployment
- **Static Files**: Collected and served efficiently
- **Database**: PostgreSQL with optimized connection pooling
- **Security**: Django security middleware and CSRF protection

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (automatically configured)
- **DEBUG**: Django debug mode (development vs production)
- **SECRET_KEY**: Django security key for sessions and CSRF

### Authentication & Family Features
- **User Authentication**: Django-based login system with registration and session management
- **Family Groups**: Users belong to family groups that share recipes, meal plans, and shopping lists
- **Invitation System**: Family owners can invite members via email with unique invitation codes
- **Access Control**: All views require authentication and filter content by family group
- **User Interface**: Fun animated "Recipe Remix" logo with gradient effects

### Current Status (August 21, 2025)
- ✓ Pure Django application (all Node.js remnants removed)
- ✓ Django server running properly on port 8000
- ✓ Database migrations applied successfully
- ✓ Application serving homepage correctly
- ✓ All Django checks passing without issues
- ✓ Revision history feature implemented with automatic change tracking
- ✓ Recipe import flow working with preview/edit functionality
- ✓ All recipe modifications now create revision snapshots
- ✓ Transformed recipe display from modals to dedicated pages with URL pattern /recipe/{recipe_id}
- ✓ Implemented 3-column grid layout for recipe details (ingredients 1 col, instructions 2 cols)
- ✓ Added image gallery, ratings, date created, cook time, and servings display on recipe pages
- ✓ AI chat assistant integrated with Langchain, Grok LLM, and SERPAPI for web searches
- ✓ Meal planning calendar with drag-and-drop functionality for weekly meal organization
- ✓ AI-powered shopping list generation from weekly meal plans using Grok
- ✓ Repositioned Edit button next to View History button for better UX
- ✓ Fixed image gallery to only display when recipes have associated images
- ✓ Integrated AI recipe cleaning service using Grok LLM via Langchain to fix errors in scraped recipes
- ✓ Added toggle option for AI cleaning when importing recipes
- ✓ **Deployment Configuration Fixed**: Added proper build and start scripts for Replit deployment
  - Added STATIC_ROOT setting to Django configuration for proper static file collection
  - Created deployment scripts (run-build, run-start) for proper build and start processes
  - Build process now properly collects 130+ static files and runs migrations
  - All deployment scripts tested and working correctly
- ✓ **Recipe Remix Rebrand**: Changed app name to "Recipe Remix" with animated gradient text logo
- ✓ **Authentication System**: Implemented Django authentication with login, signup, and logout
- ✓ **Family Management**: Created family groups where users can share recipes and meal plans
- ✓ **Invitation System**: Family owners can invite members via email with unique invitation codes
- ✓ **Access Control**: All views now require authentication and filter by family group

### Deployment Setup
- **Build Command**: `./run-build`
- **Start Command**: `./run-start`
- **Static Files**: Configured with STATIC_ROOT for production deployment
- **Database**: Migrations automatically applied during build process

The application is now fully configured for deployment as a pure Django application with proper build and start scripts handling all Django-specific requirements.