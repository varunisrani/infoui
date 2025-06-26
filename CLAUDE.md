# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InfoUI is a Canva-like design application with a Next.js frontend and Python Flask backend. It features AI-powered SVG generation, image editing, and a comprehensive design canvas using Fabric.js.

## Development Commands

### Frontend (Next.js)
- **Development**: `npm run dev` - Starts Next.js dev server on localhost:3000
- **Build**: `npm run build` - Creates production build
- **Start**: `npm start` - Runs production server
- **Lint**: `npm run lint` - Runs ESLint for code quality

### Backend (Python Flask)
- **Install dependencies**: `pip install -r server/requirements.txt`
- **Start server**: `python server/app.py` - Runs Flask server with CORS configuration
- **Test regression**: `python tests/test_regression.py` - Runs regression tests against golden.json

### Full Development Setup
1. Install frontend dependencies: `npm install`
2. Install backend dependencies: `pip install -r server/requirements.txt`
3. Set up environment variables in `.env` (see Environment Setup below)
4. Start backend: `python server/app.py`
5. Start frontend: `npm run dev`

## Environment Setup

Required environment variables in `.env`:
- `OPENAI_API_KEY` - For AI-powered SVG generation
- `GEMINI_API_KEY` - Alternative AI provider
- Additional API keys for Stripe, Supabase, UploadThing as needed

## Architecture Overview

### Frontend Stack
- **Framework**: Next.js 14.2.4 with App Router
- **Canvas**: Fabric.js 5.3.0 for drawing and editing
- **State**: Zustand for global state management
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **API**: Hono framework for serverless API routes
- **Auth**: NextAuth.js 4.22.1
- **Data Fetching**: TanStack React Query v5

### Backend Stack
- **Framework**: Flask with CORS for cross-origin requests
- **AI**: OpenAI API integration for SVG generation
- **Image Processing**: PIL, CairoSVG, OpenCV, Tesseract OCR
- **Vectorization**: VTracer for image-to-SVG conversion

### Key Directories
- `src/app/` - Next.js app router pages and API routes
- `src/features/` - Feature-based modules (editor, ai, projects, etc.)
- `src/components/` - Reusable UI components
- `server/` - Python Flask backend with AI pipelines
- `server/static/images/` - Session-based image storage

## Core Features Architecture

### Editor System
- **Canvas Management**: Global canvas state with Fabric.js integration
- **Tools**: Shape tools, text editing, drawing, image manipulation
- **History**: Undo/redo functionality with state persistence
- **Export**: PNG, JPG, SVG, JSON format support

### AI Integration
- **SVG Generation**: `server/parallel_svg_pipeline.py` - Parallel processing for AI-generated SVGs
- **OCR Pipeline**: `server/image_to_text_svg_pipeline.py` - Text extraction from images
- **Image Processing**: `server/image_only_pipeline.py` - Image manipulation workflows
- **Chat Assistant**: AI-powered design guidance with persistent chat storage

### Project Management
- **Database**: Prisma ORM with PostgreSQL
- **Auto-save**: Debounced project updates
- **Templates**: Predefined design templates system
- **Storage**: Supabase integration for SVG persistence

## Development Workflow

### Adding New Features
1. Frontend features go in `src/features/[feature-name]/`
2. API routes in `src/app/api/` using Hono framework
3. Backend AI processing in `server/` with descriptive filenames
4. UI components in `src/components/` following shadcn/ui patterns

### Canvas Development
- Canvas state is managed globally via Zustand
- All canvas operations should go through the centralized canvas store
- Use Fabric.js APIs for canvas manipulation
- Maintain history state for undo/redo functionality

### AI Pipeline Development
- Add new AI features in `server/` with descriptive names
- Follow the pattern of existing pipelines (parallel processing)
- Use OpenAI API through centralized configuration
- Handle errors gracefully with proper logging

### Database Changes
- Modify Prisma schema in `prisma/schema.prisma`
- Generate client: `npx prisma generate`
- Apply migrations: `npx prisma migrate dev`

## Testing
- Regression tests in `tests/test_regression.py` validate against `tests/golden.json`
- Run backend tests: `python tests/test_regression.py`
- Frontend testing through Next.js built-in tooling

## Deployment
- **Frontend**: Vercel deployment (configured in vercel.json if exists)
- **Backend**: Render deployment for Python Flask server
- **CORS Origins**: Update `server/app.py` CORS configuration for new domains
- **Environment**: Ensure all API keys are properly configured in deployment environments

## Important Notes
- Never commit `.env` files or API keys
- Flask server runs with specific CORS origins - update for new deployments
- Image processing requires specific Python dependencies (see requirements.txt)
- Canvas operations are resource-intensive - consider performance implications
- AI processing uses session-based folders to prevent file conflicts