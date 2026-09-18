# Resume Parser & Insight Dashboard (Apex Resume Intelligence)

An automated, queue-based candidate resume processing, optical character recognition (OCR), natural language processing (NLP) field extraction, and intelligent job role matching microservices system built for recruiters.

---

## Architecture Overview

```
                          ┌────────────────────────────────────────┐
                          │    Nginx Ingress Gateway (gateway)     │
                          │        http://localhost:8080           │
                          └───────────────────┬────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
                    ▼                                                   ▼
       ┌────────────────────────┐                          ┌────────────────────────┐
       │ Angular 18 SPA Frontend│                          │ Express REST API       │
       │ (resume_frontend)      │                          │ (resume_api:3000)      │
       └────────────────────────┘                          └───────────┬────────────┘
                                                                       │
                                              ┌────────────────────────┼────────────────────────┐
                                              ▼                        ▼                        ▼
                                    ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
                                    │ MySQL 8.0 DB     │     │ Redis 7 Queue    │     │ MinIO S3 Storage │
                                    │ (resume_mysql)   │     │ (resume_redis)   │     │ (resume_minio)   │
                                    └─────────┬────────┘     └─────────┬────────┘     └──────────────────┘
                                              │                        │
                                              └────────────────────────┼────────────────────────┘
                                                                       │
                                                                       ▼
                                                           ┌────────────────────────┐
                                                           │ BullMQ OCR & NLP Worker│
                                                           │ (resume_worker)        │
                                                           └────────────────────────┘
```

The application is structured into decoupled microservices orchestrated via **Docker Compose**:

- **Nginx Ingress Gateway (`gateway` / `resume_gateway`)**: Acts as a reverse proxy on host port `8080` (container port `80`). Routes `/` to the Angular SPA static bundle and `/api/*` to the Node.js REST API.
- **Frontend SPA (`frontend` / `resume-parser-frontend`)**: Built with **Angular 18**, SCSS, Chart.js, and Material Symbols. Serves candidate dashboard analytics, resume uploads, and real-time processing streams.
- **REST API (`api` / `resume-parser-api`)**: Built with **Node.js**, **Express**, **Prisma ORM**, JWT authentication, Helmet HTTP security, and CORS policies.
- **Background Worker (`worker` / `resume-parser-worker`)**: Asynchronous background processor using **BullMQ**, **Tesseract.js** (OCR for scanned images/PDFs), **pdf-parse**, **mammoth** (DOCX extraction), and **compromise** (NLP entity recognition).
- **Relational Database (`mysql` / `resume_mysql`)**: MySQL 8.0 store for candidate metadata, recruiter accounts, job descriptions, and match scores.
- **Cache & Message Queue (`redis` / `resume_redis`)**: Redis 7 powering BullMQ queues and real-time Server-Sent Events (SSE) Pub/Sub.
- **Object Storage (`minio` / `resume_minio`)**: S3-compatible MinIO object store for uploaded PDF, DOCX, and image resumes.

---

## Technology Stack

- **Frontend**: Angular 18, RxJS, Chart.js (`ng2-charts`), SCSS, HTML5
- **Backend API**: Node.js 20, Express, Prisma ORM 5.22, JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`
- **Worker & Pipeline**: BullMQ, Redis (`ioredis`), `tesseract.js`, `pdf-parse`, `mammoth`, `compromise`
- **Database & Storage**: MySQL 8.0, MinIO S3, Redis 7
- **DevOps & Proxy**: Docker, Docker Compose, Nginx (Alpine)

---

## Directory Structure

```text
resume-parser/
├── api/                        # Express REST API microservice
│   ├── prisma/                 # Prisma schema & MySQL migrations
│   ├── src/                    # Controllers, routes, services, middleware
│   ├── .env.example            # Environment template for API
│   └── Dockerfile              # Multi-stage Docker build for API
├── frontend/                   # Angular 18 Single Page Application
│   ├── src/                    # Components, pages, models, services
│   ├── angular.json            # Angular CLI configuration
│   └── Dockerfile              # Docker build container for Angular SPA
├── worker/                     # BullMQ background document processing worker
│   ├── prisma/                 # Shared Prisma schema for worker access
│   ├── src/                    # OCR, parser, NLP & matching workers
│   ├── .env.example            # Environment template for worker
│   └── Dockerfile              # Docker build container for worker
├── nginx/                      # Nginx API gateway configuration
│   ├── nginx.conf              # Reverse proxy rules & CSP headers
│   └── Dockerfile              # Nginx gateway image build
├── docker-compose.yml          # Container orchestration manifest
├── .env.example                # Root environment configuration template
└── README.md                   # System documentation
```

---

## Getting Started (Docker Deployment)

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+ with Docker Compose v2+)

### 2. Environment Setup
Copy the environment template file to create your local `.env`:

```bash
cp .env.example .env
```

Default port mappings:
- **Nginx Ingress Gateway**: `http://localhost:8080`
- **MinIO Console**: `http://localhost:9001` (Credentials: `minioadmin` / `minioadmin`)
- **MySQL Host Port**: `localhost:3307`
- **Redis Host Port**: `localhost:6379`

### 3. Launching Containers

Build and run all services in detached mode:

```bash
docker compose up --build -d
```

### 4. Verifying Health & Status

Check container execution status:

```bash
docker compose ps
```

Verify REST API health check endpoint:

```bash
curl http://localhost:8080/api/health
```

Expected JSON response:
```json
{
  "status": "OK",
  "service": "Resume Parser API Microservice",
  "timestamp": "2026-09-18T08:21:44.745Z"
}
```

---

## Standalone Local Development

If running services locally outside Docker:

### 1. Start Support Containers (MySQL, Redis, MinIO)
```bash
docker compose up -d mysql redis minio
```

### 2. Configure Local `.env` Files
Create service-specific `.env` files:
```bash
cp api/.env.example api/.env
cp worker/.env.example worker/.env
```

### 3. Start Backend REST API
```bash
cd api
npm install
npx prisma generate
npm run dev
```
Running at `http://localhost:3000`.

### 4. Start Background Worker
```bash
cd worker
npm install
npx prisma generate
npm run dev
```

### 5. Start Angular Frontend SPA
```bash
cd frontend
npm install
npm start
```
Access frontend dev server at `http://localhost:4200`.

---

## Useful Docker Commands

- **View Live Container Logs**:
  ```bash
  docker compose logs -f
  ```
- **Inspect Specific Container Logs**:
  ```bash
  docker compose logs -f api
  docker compose logs -f worker
  docker compose logs -f gateway
  ```
- **Stop All Containers**:
  ```bash
  docker compose down
  ```
- **Stop Containers and Remove Persistent Volumes**:
  ```bash
  docker compose down -v
  ```

---

## Security Features

- **Content Security Policy (CSP)**: Configured in Nginx (`add_header Content-Security-Policy`) for resource restriction.
- **Dynamic CORS Policy**: Origin validation restricted via `CORS_ORIGIN` environment configuration.
- **HTTP Security Headers**: Set via `helmet` in the Express API (suppressing server details and enforcing frame guard policies).
- **Authentication**: JWT-based bearer token protection on sensitive recruiter endpoints.
