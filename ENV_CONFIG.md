# Environment Configuration Guide

This project supports both development and production environments using different `.env` files.

## Available Environment Files

- **`.env.development`** - Local development configuration
- **`.env.production`** - Production server configuration

## Usage

### Development (Local)

```bash
# Copy the development environment file
cp .env.development .env

# Start the containers
docker compose up -d --build
```

**Development URLs:**
- Frontend: http://localhost:5002
- Backend API: http://localhost:5001

### Production (Server)

```bash
# Copy the production environment file
cp .env.production .env

# Start the containers
docker compose up -d --build
```

**Production URLs:**
- Frontend: https://auditoria.visitebrazopolis.com.br
- Backend API: https://apiauditoria.visitebrazopolis.com.br

## Environment Variables

### Backend
- `BACKEND_NETWORK_MODE`: `bridge` (dev) or `host` (prod)
- `DATABASE_HOST`: `postgres` (dev) or `localhost` (prod)
- `BACKEND_PORT`: Port for the backend service

### Frontend
- `NEXT_PUBLIC_API_URL`: API URL to use in the frontend build

## Automatic Deployment

The GitHub Actions workflow automatically uses `.env.production` on the server by copying it before running `docker compose up`.
