---
globs: src/bff/**, client/src/**
---

# Authentication & Authorization Patterns

## BFF Authentication (Backend-for-Frontend)

All auth goes through the NestJS BFF module (`src/bff/`). Tokens stored server-side in Redis. Browser gets httpOnly cookies only.

### BFF Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | GET | Redirect to Keycloak with PKCE. Query params: `provider`, `returnTo` |
| `/auth/callback` | GET | OIDC callback — exchange code for tokens, set httpOnly cookie, redirect to SPA |
| `/auth/refresh` | POST | Refresh access token using refresh token from Redis |
| `/auth/logout` | POST | Clear cookies, revoke Keycloak session, invalidate Redis session |
| `/auth/me` | GET | Return current user info + role + permissions |

### Cookie Configuration

```typescript
{
  httpOnly: true,       // invisible to JS — immune to XSS
  secure: true,         // HTTPS only (except local dev)
  sameSite: 'lax',      // CSRF protection
  path: '/',
  maxAge: 7 * 24 * 3600 // 7 days
}
```

### Token Flow

1. Browser sends request with httpOnly cookie (automatic — no JS involved)
2. BFF middleware reads session ID from cookie, looks up access token in Redis
3. If access token exists → inject `Authorization: Bearer` header
4. If access token expired but refresh token exists → middleware calls Keycloak to get a new access token, stores it in Redis, injects it (transparent to frontend)
5. If both expired → no header injected, `JwtAuthGuard` returns 401 (session dead, user must re-login)
6. `JwtAuthGuard` validates the token as normal

- Access tokens: Redis, short-lived (configured in Keycloak)
- Refresh tokens: Redis, 7 days, rotating
- Session cookie: browser httpOnly, 7 days

### Token Storage (Mobile — React Native)

- **Tier 1 (sensitive):** `expo-secure-store` or `react-native-keychain` — tokens, credentials
- **Tier 2 (preferences):** `AsyncStorage` — theme, locale, onboarding flags
- **Tier 3 (cached data):** TanStack Query persistence

## Authorization — Backend is Source of Truth

**Permissions are decided on the backend. Always.** The frontend is a hint layer, not a security boundary.

### Frontend Permission Expression

```tsx
const { can } = usePermissions();
if (can('invoice.delete')) { /* ... */ }

<Can permission="invoice.delete">
  <DeleteButton />
</Can>
```

Permissions fetched from `/auth/me` on login, refreshed with session.

### Frontend Auth State

```typescript
const { data: session } = useQuery({
  queryKey: ['auth', 'session'],
  queryFn: () => api.get('/auth/me'),
  retry: false,
});
const isAuthenticated = !!session;
```

### Login/Logout

```typescript
// Login — redirect to Keycloak via BFF
window.location.href = '/auth/login?provider=google&returnTo=/dashboard';

// Logout
await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
```

### Socket.IO

```typescript
const socket = io({ withCredentials: true }); // cookie sent on handshake
```

## NEVER

- **NEVER** store tokens in `localStorage` or `sessionStorage` (violates RFC 9700)
- **NEVER** set `Authorization` headers from frontend code
- **NEVER** read token claims in frontend JS — call `/auth/me`
- **NEVER** pass tokens in URL query parameters
- **NEVER** return raw tokens to the frontend
- **NEVER** bypass the BFF for auth
- **NEVER** use `AsyncStorage` for tokens on mobile
- **NEVER** bundle secrets into the mobile app binary
- **NEVER** implement frontend-only permission checks without backend enforcement
- **NEVER** use `localStorage`/`sessionStorage` to mock auth in tests — mock `/auth/me` via TanStack Query or `page.route()`
- **NEVER** implement token refresh logic in the frontend — the BFF middleware handles it server-side (RFC 9700)
- **NEVER** add 401 retry/intercept logic in the frontend API client — a 401 means the session is dead, not that a token needs refreshing
