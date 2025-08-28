# BeatHub - Music Beat Marketplace

## Overview

BeatHub is a modern music beat marketplace platform that connects music producers with artists and content creators. The application allows producers to upload and sell their beats while providing artists with a comprehensive browsing and purchasing system. Built as a full-stack web application, it features real-time audio playback, secure payment processing, and a responsive design optimized for music discovery and licensing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing with conditional rendering based on authentication state
- **State Management**: Zustand for global state (audio player and cart), React Query for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Authentication**: OpenID Connect (OIDC) integration with Replit Auth using Passport.js
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **API Design**: RESTful endpoints with proper error handling and logging middleware

### Data Storage
- **Database**: PostgreSQL with Neon serverless for scalable cloud hosting
- **ORM**: Drizzle ORM with type-safe queries and schema migrations
- **Schema**: Comprehensive data model supporting users, beats, cart items, purchases, likes, and sessions
- **Validation**: Zod schemas for runtime type checking and API validation

### Authentication & Authorization
- **Provider**: Replit OIDC for seamless integration with the hosting platform
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Security**: HTTP-only cookies with secure flags and CSRF protection
- **User Roles**: Support for producers, artists, and hybrid user types

### Audio System
- **Playback**: Custom audio player component with global state management
- **Features**: Play/pause controls, volume adjustment, progress tracking, and queue management
- **Storage**: Audio files hosted externally with URL references in the database

### File Organization
- **Monorepo Structure**: Organized into client/, server/, and shared/ directories
- **Shared Types**: Common schemas and types shared between frontend and backend
- **Path Aliases**: TypeScript path mapping for clean imports (@/ for client, @shared/ for shared)

### Development Features
- **Hot Reload**: Vite development server with HMR for rapid iteration
- **Error Handling**: Runtime error overlay in development with comprehensive error boundaries
- **Type Safety**: End-to-end TypeScript with strict type checking enabled

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Platform**: Hosting and development environment with integrated authentication

### UI & Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Comprehensive icon library for UI elements

### Development Tools
- **Drizzle Kit**: Database migration and schema management tools
- **React Hook Form**: Form state management with validation
- **React Query**: Server state management with caching and synchronization

### Audio & Media
- **Web Audio API**: Native browser audio capabilities for playback control
- **External CDNs**: For hosting audio files and artwork images

### Authentication Services
- **Replit OIDC**: OAuth 2.0/OpenID Connect provider for user authentication
- **Passport.js**: Authentication middleware with strategy pattern support

### Payment Processing
- **Architecture Ready**: Designed to integrate with payment providers like Stripe or PayPal
- **License Types**: Support for basic, premium, and exclusive licensing models