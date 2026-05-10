---
globs: src/**/*.spec.ts, src/**/*.test.ts, client/src/**/*.test.ts, client/src/**/*.test.tsx, client/e2e/**
---

# Testing Patterns

## Backend — Three Layers

### Unit Tests (Jest)

Test handlers, validators, and utilities in isolation.

Every handler test must cover: happy path, validation failure, not found, conflict, permission check.

Validator tests are mandatory and separate.

### Integration Tests (Jest + Supertest)

Full HTTP → Controller → Pipeline → Handler → Database round trips.

**Real database, not mocks.** Run against PostgreSQL via `docker-compose.test.yml`.

### E2E Tests

Isolated test stack: `docker-compose.test.yml` with separate ports (API 3099, Keycloak 8099).

## Frontend — Three Layers

### Component Tests (Vitest + React Testing Library)

Test user-visible behavior, not implementation details.

**Query priority:** `getByRole` > `getByLabelText` > `getByText` > `getByTestId` (last resort).

**Every component test must cover:** happy path, loading state, error state, empty state, user interactions.

```typescript
it('renders item name', () => {
  render(<ItemCard item={{ id: '1', name: 'Test' }} />);
  expect(screen.getByRole('heading', { name: 'Test' })).toBeInTheDocument();
});
```

### Hook Tests (Vitest + TanStack Query)

Test custom hooks with a real QueryClient. Use MSW for API mocking.

**Auth mocking:**
```typescript
// ✅ CORRECT
queryClient.setQueryData(['auth', 'session'], { keycloakId: 'test-id', roles: ['user'] });

// ❌ WRONG
localStorage.setItem('access_token', 'fake-jwt');
```

### E2E Tests (Playwright)

Mock APIs via `page.route()`. Every spec covers 4 states:

| State | Mock |
|-------|------|
| Happy path | API returns 200 |
| Error | API returns 500 |
| Empty | API returns 200 + empty array |
| Loading | Delay API response |

**Auth in E2E:**
```typescript
await page.route('**/auth/me', route => route.fulfill({
  status: 200,
  body: JSON.stringify({ keycloakId: 'kc-1', roles: ['user'] }),
}));
```

**Responsive testing:** Test at mobile viewport (375×812) and desktop.

## CI Pipeline

```
PR → lint → type-check → unit tests → integration tests → UI E2E → merge
Nightly → system E2E (full stack)
```

## NEVER

- **NEVER** test implementation details (internal state, private methods, CSS classes)
- **NEVER** use CSS selectors in E2E tests — use semantic locators
- **NEVER** use `page.waitForTimeout()` — use web-first assertions
- **NEVER** use `fireEvent` — use `userEvent`
- **NEVER** mock the database in integration tests
- **NEVER** use `localStorage`/`sessionStorage` for auth in tests
- **NEVER** write happy-path-only tests
- **NEVER** use `setTimeout`/`waitForTimeout` for timing in tests
