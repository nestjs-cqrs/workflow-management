---
globs: client/**
---

# Frontend Patterns

## State Management — Decision Tree

| State type | Tool | When |
|---|---|---|
| **Server/remote data** | TanStack Query (`useQuery` / `useMutation`) | Data from API |
| **URL-derived state** | `useSearchParams` (React Router) | Filters, tabs, pagination — anything bookmarkable |
| **Local UI state** | `useState` | Open/closed, hover, animation — never leaves the component |
| **Shared client state** | Zustand store | Client-only state needed by 2+ unrelated components |
| **Form state** | `react-hook-form` + Zod | Multi-field forms with validation |

### TanStack Query — All API Calls

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['items', id],
  queryFn: () => api.getItem(id),
});
```

Same `queryKey` in multiple components = one network request (auto-dedup).

### Zustand — Selectors Only

```typescript
// ✅ CORRECT — only re-renders when radius changes
const radius = useFilterStore((s) => s.radius);

// ❌ WRONG — re-renders on ANY store change
const { radius, category } = useFilterStore();
```

### URL State

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const tab = searchParams.get('tab') ?? 'discover';
```

## API Error Handling

The backend returns RFC 9457 problem-details JSON on all errors. The API client (`api/client.ts`) parses these into `ApiError` instances.

### Handling errors in mutations

```typescript
const mutation = useMutation({
  mutationFn: (dto: CreateItemDto) => api.post('/items', dto),
  onError: (error) => {
    if (error instanceof ApiError && error.isValidation) {
      // error.validationErrors contains field-level errors
    }
  },
});
```

### Displaying errors

```typescript
if (error instanceof ApiError) {
  // error.detail — human-readable message from backend
  // error.correlationId — for support/debugging
  // error.validationErrors — field-level errors (400 only)
}
```

### 401 handling

A 401 means the session is dead. Redirect to login — do NOT retry.

## shadcn/ui Components

Use shadcn/ui primitives from `@/components/ui`. Compose into feature components — never modify primitives directly. All components must accept `className` for extension and forward refs.

## Component Library Requirements

- Every shared component must have a Storybook entry showing variants, states (loading, disabled, error), and usage
- Accessibility enforced in CI via axe-core at WCAG 2.1 Level AA — violations block PR merges

## Dark Mode

Use CSS variables: `hsl(var(--background))`, `hsl(var(--primary))`, etc.

## TypeScript Strict Mode

All code uses `strict: true`, `noUncheckedIndexedAccess: true`. No `any`, no `@ts-ignore`.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Browser Type Safety

```typescript
// ❌ WRONG — requires @types/node
const timer: NodeJS.Timeout = setTimeout(() => {}, 1000);

// ✅ CORRECT
const timer: ReturnType<typeof setTimeout> = setTimeout(() => {}, 1000);
```

## Page Components

All page components are lazy-loaded with `React.lazy()` and wrapped in `<Suspense>`.

## Design Tokens

No hardcoded hex values in application code. All visual values come from design tokens/CSS variables.

## NEVER

- **NEVER** fetch data with `useEffect` + `useState` — use TanStack Query
- **NEVER** copy query data into `useState` — it creates a stale snapshot
- **NEVER** mirror URL params into `useState` — read from `useSearchParams` directly
- **NEVER** put server data in Zustand — use TanStack Query
- **NEVER** destructure entire Zustand store without selectors
- **NEVER** add Redux, MobX, Jotai, Recoil, or Valtio
- **NEVER** use `console.log` in production code — use Sentry
- **NEVER** use `any` — use `unknown` and narrow
- **NEVER** use `@ts-ignore` — use `@ts-expect-error` with comment
- **NEVER** use `NodeJS.Timeout` or other Node.js types in frontend code
- **NEVER** hardcode hex colors or spacing values — use design tokens
- **NEVER** prop-drill through components that don't use the prop
- **NEVER** parse API error responses manually — use `ApiError` properties (`detail`, `validationErrors`, `correlationId`)
- **NEVER** show raw error messages to users in production — map `ApiError.status` to user-friendly messages
