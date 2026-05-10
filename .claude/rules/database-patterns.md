---
globs: src/**
---

# Database Patterns

## TypeORM Code-First Migrations

Generate migrations from entity changes — never write SQL by hand:

```bash
npx typeorm migration:generate src/migrations/AddItemTable
npx typeorm migration:run
```

## Schema Per Service

Each service gets its own PostgreSQL schema (e.g., `identity`, `billing`).
Migrations reference the schema explicitly.

## CRITICAL: TypeORM Uses camelCase Column Names

TypeORM's default naming strategy maps entity properties directly to column names.
**Column names in the database are camelCase, NOT snake_case.**

```typescript
// Entity property: displayLatitude
// Database column: "displayLatitude" (NOT display_latitude)

// ❌ WRONG
CREATE INDEX idx_post_lat ON activity.posts ("display_latitude");

// ✅ CORRECT
CREATE INDEX idx_post_lat ON activity.posts ("displayLatitude");
```

When referencing tables in raw SQL, use `schema.tableName` (NOT `"schema"."tableName"` with the schema quoted):
```sql
-- ❌ WRONG
SELECT * FROM "activity"."post";

-- ✅ CORRECT
SELECT * FROM activity.posts;
```

## Entity Index Patterns — No Duplicates

Use EITHER class-level `@Index` OR property-level `@Index`, never both for the same column.

## Migration SQL Rules

### CREATE INDEX CONCURRENTLY — Non-Transactional Migrations Only

TypeORM migrations run inside transactions by default. `CONCURRENTLY` cannot run in a transaction. For normal migrations, use regular `CREATE INDEX`:

```typescript
// ❌ WRONG — CONCURRENTLY inside a default (transactional) migration
await queryRunner.query(`CREATE INDEX CONCURRENTLY idx_name ON schema.table ("column")`);

// ✅ CORRECT — regular index in a transactional migration
await queryRunner.query(`CREATE INDEX idx_name ON schema.table ("column")`);
```

For large tables (millions of rows) where locking must be avoided, create a **separate migration file** with `transaction = false`:

```typescript
export class AddIndexOnOrderLocationConcurrently1234567890 implements MigrationInterface {
  transaction = false as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_location ON catalog.orders ("latitude", "longitude")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS catalog.idx_order_location`);
  }
}
```

### NEVER Write Hand-Crafted Migrations That Duplicate Entities

If a TypeORM entity defines a table, run `migration:generate`. Do NOT also write a manual `CREATE TABLE`.

## Migration Naming Convention

Use descriptive names: `AddItemTable`, `AddStatusColumnToOrder`, `CreateIndexOnEmail`.

## NEVER

- **NEVER** use `synchronize: true` in staging or production
- **NEVER** write snake_case column names
- **NEVER** use `CREATE INDEX CONCURRENTLY` inside transactional migrations
- **NEVER** write manual `CREATE TABLE` for tables with TypeORM entities
- **NEVER** access another module's tables directly
