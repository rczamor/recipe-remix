# Recipe Manager Application

## Overview

This is a full-stack recipe management application built with React, Express, and PostgreSQL. The application allows users to scrape recipes from URLs, manage their recipe collection, rate recipes, create shopping lists, and clone/modify existing recipes. It features a modern UI built with Radix UI components and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Bundler**: Vite for development and production builds
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM with type-safe queries
- **Web Scraping**: Cheerio for HTML parsing and recipe extraction
- **Session Management**: Session-based authentication using connect-pg-simple

### Project Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Utility functions and API client
│   │   └── hooks/        # Custom React hooks
├── server/               # Backend Express application
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database layer abstraction
│   ├── db.ts            # Database connection setup
│   └── services/        # Business logic services
├── shared/               # Shared TypeScript types and schemas
└── migrations/           # Database migration files
```

## Key Components

### Database Schema
- **recipes**: Core recipe data with metadata, ratings, and clone relationships
- **ingredients**: Recipe ingredients with pricing and brand information
- **instructions**: Step-by-step cooking instructions with timing
- **ratings**: User ratings for recipes (session-based)

### API Services
- **Recipe Management**: CRUD operations for recipes with search functionality
- **Web Scraping**: Automatic recipe extraction from URLs using JSON-LD and HTML parsing
- **Rating System**: Session-based recipe rating with average calculation
- **Shopping Lists**: Ingredient aggregation and cost calculation

### Frontend Features
- **Recipe Cards**: Grid-based recipe display with ratings and metadata
- **Recipe Details Modal**: Full recipe view with ingredients and instructions
- **Add Recipe Modal**: URL-based recipe import with scraping
- **Clone Recipe Modal**: Recipe duplication with editing capabilities
- **Shopping List Sidebar**: Ingredient aggregation with pricing

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