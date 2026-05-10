# AutoFlux

## Stack

- **Backend:** NestJS (modular monolith), CQRS with pipeline behaviors, TypeORM, PostgreSQL, Redis, Keycloak BFF auth
- **Frontend:** React, Vite, TanStack Query, Zustand, React Hook Form + Zod, Tailwind CSS, shadcn/ui
- **Infrastructure:** Docker Compose (local dev), Kubernetes + Helm + ArgoCD (production)

## Architecture

**Modular monolith.** One backend Docker image, one frontend Docker image. Modules communicate via CommandBus/QueryBus. Each module owns its own PostgreSQL schema.

**CQRS.** Every operation is a Command/Query class + Handler. Controllers are thin — they only parse requests and dispatch to the bus.

**BFF Authentication.** Tokens stored server-side in Redis. Browser gets httpOnly cookies only. No tokens in localStorage/sessionStorage ever.

## Dev Workflow

```bash
# Start backend + infrastructure
docker compose up

# Start frontend (separate terminal)
cd client && npm run dev

# Browser
open http://localhost:5173
```

**Ports:** 5173 (frontend/Vite), 3000 (backend API), 8080 (Keycloak)

## Key Conventions

- Database columns are **camelCase** (TypeORM default naming strategy)
- Handlers return `Result<T>` — never throw for business errors
- Validation: DTOs use class-validator, Commands use Zod via `@Validate`
- Entities extend `BaseEntity` from the shared kernel
- Generate migrations from entities: `npx typeorm migration:generate src/migrations/Name`

## Test Commands

```bash
# Backend unit + integration tests
npm test

# Frontend tests
cd client && npm test

# E2E tests
cd client && npx playwright test
```
