# Workflow Management

## Stack

- **Backend:** NestJS, CQRS with pipeline behaviors, TypeORM, PostgreSQL, Kogito integration
- **Infrastructure:** Docker Compose (local dev)

## Architecture

Generic workflow management service. Provides approval/rejection/cancellation APIs for Kogito-orchestrated workflows. Business apps (AutoFlux, etc.) start workflows via `@Workflow` decorator — this app manages the human interaction side.

Connects to the same PostgreSQL database as business apps to read `WorkflowInstance` records created by the `@turkelk/nestjs-cqrs-workflow` framework.

## Dev Workflow

```bash
npm run start:dev
# API: http://localhost:3001
# Swagger: http://localhost:3001/api/docs
```

## Key Conventions

- Handlers return `Result<T>` — never throw for business errors
- Database columns are camelCase
- Publishes CloudEvents to Kogito for approval decisions
- Controllers are thin — dispatch to CommandBus/QueryBus only
- DTOs use class-validator decorators + @ApiProperty for Swagger
- Structured logging via Pino (no console.log)
