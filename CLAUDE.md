# Workflow Management

## Stack

- **Backend:** NestJS, CQRS, Kogito SonataFlow REST API (sole source of truth)
- **Infrastructure:** Docker Compose (local dev)

## Architecture

Generic workflow management service. Provides approval/rejection/cancellation APIs for Kogito-orchestrated workflows. Business apps (AutoFlux, etc.) start workflows via Kogito — this app manages the human interaction side.

**No local database.** All workflow state lives in Kogito SonataFlow (http://localhost:8180). This service queries Kogito's REST API for workflow instances and publishes CloudEvents for approval decisions.

### Kogito REST API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{processId}` | GET | List all instances of a workflow definition |
| `/{processId}/{instanceId}` | GET | Get instance details (status, variables, nodes) |
| `/{processId}/{instanceId}/tasks` | GET | Get pending user tasks for an instance |
| `/{processId}/{instanceId}` | DELETE | Abort/cancel a workflow instance |
| `/` | POST | Receive CloudEvents (approval decisions) |

## Dev Workflow

```bash
npm run start:dev
# API: http://localhost:3001
# Swagger: http://localhost:3001/api/docs
```

## Key Conventions

- Handlers return `Result<T>` — never throw for business errors
- Publishes CloudEvents to Kogito for approval decisions
- Controllers are thin — dispatch to CommandBus/QueryBus only
- DTOs use class-validator decorators + @ApiProperty for Swagger
- Structured logging via Pino (no console.log)
- KogitoApiService wraps all Kogito REST calls
- KogitoEventService handles CloudEvent publishing
