# Environment Configuration Guide

This project supports both development and production environments using different configurations.

## Available Files

- **`docker-compose.yml`** - Base configuration (minimal, no networks for backend)
- **`docker-compose.dev.yml`** - Development overrides (adds backend to network)
- **`docker-compose.prod.yml`** - Production overrides (uses host network mode)
- **`.env.development`** - Development environment variables
- **`.env.production`** - Production environment variables

## Usage

### Development (Local)

```bash
# Copy the development environment file
cp .env.development .env

# Start the containers with development overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

**Development URLs:**
- Frontend: http://localhost:5002
- Backend API: http://localhost:5001

**Development Configuration:**
- Backend uses bridge network mode
- Connects to PostgreSQL via service name `postgres`
- Frontend uses `http://localhost:5001` for API

### Production (Server)

```bash
# Copy the production environment file
cp .env.production .env

# Start the containers with production overrides
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Production URLs:**
- Frontend: https://auditoria.visitebrazopolis.com.br
- Backend API: https://apiauditoria.visitebrazopolis.com.br

**Production Configuration:**
- Backend uses host network mode (for MySQL connectivity)
- Connects to PostgreSQL via `localhost`
- Frontend uses `https://apiauditoria.visitebrazopolis.com.br` for API

## Environment Variables

### Backend
- `DATABASE_HOST`: `postgres` (dev) or `localhost` (prod)
- `BACKEND_PORT`: Port for the backend service

### Frontend
- `NEXT_PUBLIC_API_URL`: API URL to use in the frontend build

## Why Two Docker Compose Files?

The production environment requires `network_mode: host` for the backend to connect to MySQL using the server's IP (which has permission). However, `network_mode` and `networks` are mutually exclusive in Docker Compose.

Solution: Use docker-compose override files:
- Base file (`docker-compose.yml`): Development configuration with bridge network
- Override file (`docker-compose.prod.yml`): Production-specific changes (host network mode)

## Automatic Deployment

The GitHub Actions workflow automatically:
1. Copies `.env.production` to `.env`
2. Runs `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
