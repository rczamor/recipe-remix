# Recipe Manager Application

## Overview

This is a full-stack family recipe management web application built with Django and PostgreSQL. The application allows users to scrape recipes from URLs, store them in structured format, rate recipes, clone and modify them, generate shopping lists based on ingredients, and track revision history for each recipe. The app is publicly viewable without authentication and features an elegant, user-friendly interface built with Tailwind CSS and vanilla JavaScript.

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

### Frontend Features (Vanilla JavaScript)
- **Recipe Grid**: Responsive card-based recipe display with ratings and metadata
- **Recipe Details Pages**: Dedicated pages for each recipe with URL pattern /recipe/{recipe_id}
  - 3-column grid layout: ingredients (1 column), instructions (2 columns)
  - Image gallery at the top
  - Ratings, date created, cook time, and servings displayed under title
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
- **Application**: Django development server on port 5000
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

### Current Status (July 30, 2025)
- ✓ Successfully migrated from Node.js/React to Django
- ✓ Django server running properly on port 5000
- ✓ Database migrations applied successfully
- ✓ Application serving homepage correctly
- ✓ All Django checks passing without issues
- ✓ Revision history feature implemented with automatic change tracking
- ✓ Recipe import flow working with preview/edit functionality
- ✓ All recipe modifications now create revision snapshots
- ✓ Transformed recipe display from modals to dedicated pages with URL pattern /recipe/{recipe_id}
- ✓ Implemented 3-column grid layout for recipe details (ingredients 1 col, instructions 2 cols)
- ✓ Added image gallery, ratings, date created, cook time, and servings display on recipe pages

The application now runs as a pure Django web application with server-side rendering, vanilla JavaScript for client-side interactivity, comprehensive revision history tracking, and dedicated recipe detail pages.