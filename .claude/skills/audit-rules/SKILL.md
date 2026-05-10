# Audit Rules Against ADRs

## Usage
`/audit-rules` — compare `.claude/rules/` against the engineering ADR repository and report gaps.

## Context

Rules in `.claude/rules/` are derived from architectural decision records (ADRs) at:
`https://github.com/nestjs-cqrs/engineering-adrs`

Over time, ADRs get updated or new ones are added without updating rules, and vice versa. This skill detects drift between the two.

## ADR-to-Rule Mapping

| ADR (Backend) | Rule File |
|---|---|
| 001-modular-monolith.md | backend-patterns.md |
| 002-cqrs-pipeline-behaviors.md | backend-patterns.md |
| 003-result-error-handling.md | backend-patterns.md, api-patterns.md |
| 004-bff-authentication.md | auth-patterns.md |
| 005-multi-tenancy-rls.md | database-patterns.md |
| 006-typeorm-code-first-migrations.md | database-patterns.md |
| 007-two-layer-validation.md | backend-patterns.md |
| 008-redis-streams-events.md | backend-patterns.md |
| 009-kubernetes-helm-argocd.md | docker-patterns.md |
| 010-api-documentation.md | api-patterns.md |
| 011-observability.md | observability-patterns.md |
| 012-testing-strategy.md | testing-patterns.md |
| 013-local-development-workflow.md | docker-patterns.md |

| ADR (Frontend) | Rule File |
|---|---|
| 001-monorepo-tooling.md | frontend-patterns.md |
| 002-design-tokens-and-component-libraries.md | frontend-patterns.md |
| 003-state-management.md | frontend-patterns.md |
| 004-authentication-and-authorization.md | auth-patterns.md |
| 005-typescript-strict-mode.md | frontend-patterns.md |
| 006-mobile-secure-storage.md | auth-patterns.md |
| 007-observability.md | observability-patterns.md |
| 008-testing-strategy.md | testing-patterns.md |
| 009-local-development-workflow.md | docker-patterns.md |

## Process

### Step 1: Clone latest ADRs

Clone the ADR repo to a temp directory:
```bash
git clone https://github.com/nestjs-cqrs/engineering-adrs /tmp/engineering-adrs
```
If it already exists, pull the latest: `git -C /tmp/engineering-adrs pull`

### Step 2: Read all files

Read every ADR file listed in the mapping table above and every rule file in `.claude/rules/`. Do this in parallel using multiple Read calls to be efficient.

### Step 3: Compare each ADR-rule pair

For each mapping in the table, compare the ADR's decisions against the corresponding rule file. Check for:

**Missing rules** — decisions, bans ("NEVER"), or patterns defined in the ADR but absent from the rule file:
- Code patterns or conventions mandated in the ADR
- Explicit bans ("What is explicitly banned" sections)
- Technology choices or library mandates
- Configuration requirements
- Mapping tables (e.g., Result-to-HTTP mappings)

**Stale rules** — rules that contradict or no longer match the current ADR:
- Values that changed (e.g., a timeout was 30s in the rule but the ADR now says 60s)
- Patterns that were replaced by newer decisions
- Libraries or tools that were swapped

**Unmapped ADRs** — any ADR file in the repo that does not appear in the mapping table above. These may need a new rule file or an addition to an existing one.

### Step 4: Report

Output a structured report with three sections:

```
## Audit: Rules vs ADRs

### Gaps Found
For each gap:
- **ADR:** <filename> — <section or quote>
- **Rule:** <filename> — what's missing or wrong
- **Action:** what should be added/changed

### Stale Rules
For each stale rule:
- **Rule:** <filename> — <the stale content>
- **ADR:** <filename> — <what it should say now>
- **Action:** what should change

### New ADRs Without Rules
For each unmapped ADR:
- **ADR:** <filename> — <summary of decisions>
- **Suggested rule file:** <which rule file to add it to>

### Summary
- X gaps found
- X stale rules
- X unmapped ADRs
```

### Step 5: Offer to fix

After presenting the report, ask the user:
"Want me to fix these gaps?" using AskUserQuestion with options:
- **Fix all** — update all rule files to match ADRs
- **Fix one by one** — go through each gap and ask before fixing
- **Report only** — no changes, just the audit

If the user chooses to fix, update only the rule files (`.claude/rules/`), never the ADRs. ADRs are the source of truth.

Also update the mapping table in this skill file if new ADRs were found that need mapping.

## Rules

- ADRs are the source of truth. Rules derive from ADRs, not the other way around.
- NEVER modify ADR files — only modify rule files.
- When reporting gaps, quote the specific ADR section so the user can verify.
- Ignore stylistic differences (wording, formatting) — only flag semantic gaps.
- If an ADR section says "planned" or "future", do NOT flag it as missing from rules. Rules only cover current decisions.
- Check ADR status field — only compare "Accepted" ADRs. Skip "Proposed", "Deprecated", or "Superseded" ADRs.
