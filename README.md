# Cloud Sync - Cloud Storage Platform

A full-stack cloud storage platform built with React, Spring Boot, PostgreSQL, MinIO, and Redis. Features chunked/resumable uploads, file versioning, SHA-256 deduplication, secure sharing, and real-time notifications.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Tailwind CSS v3 · TanStack Query |
| Backend | Java 21 · Spring Boot 3.4 · Spring Security · JWT |
| Database | PostgreSQL 16 |
| Object Storage | MinIO (S3-compatible) |
| Cache | Redis 7 |
| Build | Maven 3.9 · Vite 6 |
| Deployment | Docker Compose |

## Getting Started

### Prerequisites

- **Java 21** JDK
- **Maven 3.9+** (or use included `mvnw`)
- **Node.js 20+** and **npm**
- **Docker** and **Docker Compose**

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL, MinIO, and Redis.

### 2. Start Backend

```bash
cd backend
mvn spring-boot:run
```

The API runs at `http://localhost:8080`.

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI runs at `http://localhost:5173`.

### Default Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080/api |
| MinIO Console | http://localhost:9001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| MinIO | minioadmin | minioadmin123 |
| PostgreSQL | cloudsync | cloudsync_secret |

## Project Structure

```
GRAVITY-CLOUD/
├── backend/                    # Spring Boot API
│   ├── pom.xml
│   └── src/main/java/com/cloudsync/
│       ├── auth/               # Authentication (JWT, login, register)
│       ├── user/               # User management
│       ├── config/             # Security, CORS, MinIO, Redis configs
│       └── common/             # Shared utilities, exception handler
├── frontend/                   # React + Vite UI
│   └── src/
│       ├── api/                # Axios client, API functions
│       ├── auth/               # Auth context, login/register pages
│       ├── components/layout/  # Sidebar, header, app shell
│       ├── pages/              # Dashboard, Files, Shared, Trash, Analytics
│       ├── types/              # TypeScript interfaces
│       └── utils/              # Formatting helpers
├── docker-compose.yml          # PostgreSQL, MinIO, Redis
└── .env.example                # Environment template
```

## Architecture

```
React Frontend (Vite)
       |
       v
Spring Boot API (JWT Auth)
       |
       +------ PostgreSQL (metadata, users)
       |
       +------ Redis (caching)
       |
       +------ MinIO (file storage)
       |
       +------ Scheduler (background jobs)
       |
       +------ WebSocket (notifications)
```

## License

Private project.
