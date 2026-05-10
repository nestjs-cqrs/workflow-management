---
globs: src/**
---

# Backend Patterns

## Modular Monolith

Two deployable artifacts: one NestJS backend image, one React frontend image. No microservices.

### Module Structure

```
src/
  <module>/           # Domain module (e.g., identity, billing)
  bff/                # BFF authentication
  shared/             # Guards, filters, interceptors
```

### Module Boundary Rules

- Modules communicate through `CommandBus`/`QueryBus` — never import another module's services or repositories
- Each module owns its own PostgreSQL schema (e.g., `identity.*`, `billing.*`)
- Async inter-module communication uses Redis Streams
- Only commands, queries, and DTOs are exported from a module

## POST-IMPLEMENTATION CHECKLIST (run after every command/handler pair)

- [ ] Command class has `@Validate(XxxValidator)` decorator
- [ ] `.validator.ts` file exists with Zod schema + `ICommandValidator<T>`
- [ ] Handler uses `getTransactionalRepo(this.xxxRepo)` — never `this.xxxRepo` directly
- [ ] Handler does NOT contain `Result.validationError()` or any validation logic
- [ ] Controller only injects `CommandBus`/`QueryBus` — no services, no repositories

## Controller Pattern (MANDATORY — thin controllers)

Controllers ONLY parse the request and dispatch to command/query bus.

```typescript
@Controller('items')
export class ItemsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.commandBus.execute(new CreateItemCommand(dto.name, dto.description));
  }
}
```

## CQRS Handler Pattern

Every operation is a Command/Query class + Handler pair.

```typescript
@Validate(CreateItemValidator)
@DistributedLock('create-item:{name}')
export class CreateItemCommand {
  constructor(public readonly name: string) {}
}

@CommandHandler(CreateItemCommand)
export class CreateItemHandler implements ICommandHandler<CreateItemCommand> {
  constructor(@InjectRepository(Item) private readonly itemRepo: Repository<Item>) {}
  async execute(command: CreateItemCommand): Promise<Result<ItemDto>> {
    const itemRepo = getTransactionalRepo(this.itemRepo);
    const item = itemRepo.create({ name: command.name });
    await itemRepo.save(item);
    return Result.success(toDto(item));
  }
}
```

## Pipeline Behavior Chain

**Commands:** `Log → FeatureFlag → Validate → Cache → DistributedLock → Transactional → Handler`
**Queries:** `Log → FeatureFlag → Validate → Cache → Handler`

All commands automatically participate in an ambient transaction (UnitOfWork). Nested commands join the outer transaction. Use `@IsolatedTransaction()` for operations that must commit independently (audit logs, notification delivery).

## Result<T> Usage

Handlers return `Result<T>` — never throw for business errors.

```typescript
Result.success(value)
Result.failure(ErrorType.NotFound, 'message')
Result.notFound('message')
Result.conflict('message')
Result.forbidden('message')
Result.unauthorized('message')
Result.unprocessableEntity('message')
```

## Validation Pattern (Two Layers)

| Layer | Tool | Where |
|-------|------|-------|
| DTO (controller) | class-validator | `*.dto.ts` |
| Command (pipeline) | Zod + `@Validate` | `*.validator.ts` |

**CRITICAL:** The command class MUST have `@Validate(XxxValidator)` or the validator never runs.

```typescript
export class CreateItemValidator implements ICommandValidator<CreateItemCommand> {
  private schema = z.object({
    name: z.string().min(1).max(200),
  });
  validate(cmd: CreateItemCommand) { return validateCommand(this.schema, cmd); }
}
```

## Redis Streams — Inter-Module Events

- Use `RedisStreamConsumer` base class for consumers (handles connection isolation)
- Every consumer uses a **dedicated cloned connection** for blocking XREADGROUP
- Shared `REDIS_CLIENT` is for non-blocking ops only (cache, XADD, locks)
- `onModuleInit()` for setup; `onApplicationBootstrap()` for polling loops
- Events published after transaction commits

### Retry and Dead-Letter Policy

- **Max retries:** 5 with exponential backoff + jitter (`min(1s × 2^attempt + random(0,1000ms), 30s)`)
- **Dead-letter stream:** `{stream}:dlq` (e.g., `orders:events:dlq`) with `MAXLEN ~ 100000`
- Failed events are never silently dropped — retry or dead-letter

## NestJS Module Patterns

### .forRoot() — Import ONCE in app.module.ts

`ScheduleModule.forRoot()`, `LoggerModule.forRoot()`, `BullModule.forRoot()`, `EventEmitterModule.forRoot()`, `ThrottlerModule.forRoot()` — only in `app.module.ts`.

### Module Exports

Only export providers declared in the module. Exporting undeclared classes causes runtime errors.

## NEVER

- **NEVER** inject services or repositories into controllers — dispatch to the bus only
- **NEVER** put business logic in controllers
- **NEVER** put validation logic in handlers — use `@Validate` + `.validator.ts`
- **NEVER** use Joi, Yup, or other validation libraries — class-validator for DTOs, Zod for commands
- **NEVER** create a `.validator.ts` file without `@Validate(XxxValidator)` on the command class — it's dead code
- **NEVER** throw `HttpException` from handlers — return `Result<T>`
- **NEVER** use `Result.validationError()` in handlers
- **NEVER** ignore Result values from nested commands
- **NEVER** call `.unwrap()` inside handlers
- **NEVER** manually manage transactions — use `getTransactionalRepo()`
- **NEVER** share Redis connection for blocking XREADGROUP reads
- **NEVER** start blocking poll loops in `onModuleInit()` — use `onApplicationBootstrap()`
- **NEVER** publish events before the transaction commits
- **NEVER** silently drop failed stream events — retry with backoff or dead-letter
- **NEVER** use `NestJS EventEmitter` for inter-module events
- **NEVER** use global singletons for shared business state across modules — use Redis or the database
- **NEVER** import `.forRoot()` modules in feature modules
