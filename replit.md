# Recipe Manager Application

## Overview

This is a full-stack family recipe management web application built with Django and PostgreSQL. The application allows users to scrape recipes from URLs, store them in structured format, rate recipes, clone and modify them, and generate shopping lists based on ingredients. The app is publicly viewable without authentication and features an elegant, user-friendly interface built with Tailwind CSS and vanilla JavaScript.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology**: Vanilla JavaScript with modern ES6+ features
- **UI Framework**: Tailwind CSS for responsive design and styling
- **Icons**: Font Awesome for consistent iconography
- **Interactivity**: DOM manipulation with event handling and dynamic content rendering
- **API Communication**: Fetch API for RESTful backend communication

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

### Backend Services (Django Views & Services)
- **Recipe Management**: Full CRUD operations with search functionality
- **Web Scraping**: Automatic recipe extraction from URLs using BeautifulSoup4, supporting JSON-LD structured data and HTML parsing
- **Rating System**: Anonymous session-based recipe rating with automatic average calculation
- **Shopping Lists**: Dynamic ingredient aggregation with cost calculation
- **Recipe Cloning**: Full recipe duplication with editing capabilities

### Frontend Features (Vanilla JavaScript)
- **Recipe Grid**: Responsive card-based recipe display with ratings and metadata
- **Recipe Details Modal**: Complete recipe view with ingredients, instructions, and actions
- **Add Recipe Modal**: URL-based recipe import with real-time scraping feedback
- **Shopping List Sidebar**: Dynamic ingredient aggregation with pricing and management
- **Rating System**: Interactive star-based rating with immediate feedback

## Data Flow

1. **Recipe Import**: User provides URL → Backend scrapes recipe data → Stores in database → Returns structured recipe
2. **Recipe Display**: Frontend queries recipes → Backend retrieves from database → Renders in card grid
3. **Recipe Rating**: User rates recipe → Backend updates rating and recalculates average → UI reflects new rating
4. **Shopping List**: User selects ingredients → Frontend aggregates selections → Backend calculates totals
5. **Recipe Cloning**: User clones recipe → Frontend opens editing modal → Backend creates new recipe with modifications

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe database queries and migrations
- **@tanstack/react-query**: Server state management and caching
- **cheerio**: HTML parsing for web scraping
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **vite**: Fast development server and build tool
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR and middleware mode
- **Backend**: tsx with nodemon-like behavior for auto-restart
- **Database**: Neon PostgreSQL with connection pooling

### Production
- **Build Process**: 
  - Frontend: Vite builds to `dist/public`
  - Backend: esbuild bundles server to `dist/index.js`
- **Serving**: Express serves both API routes and static frontend files
- **Database**: PostgreSQL connection with environment-based configuration

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment detection for development/production features
- **REPL_ID**: Replit-specific integration for development tools

The application follows a typical full-stack pattern where the Express server handles both API requests and serves the built React application in production, while providing separate development servers in development mode.