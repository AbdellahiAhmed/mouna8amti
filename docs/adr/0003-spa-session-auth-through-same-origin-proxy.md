# ADR 0003: SPA session auth through a same-origin proxy

- **Status:** Accepted, 2026-10-21

## Context

The web app (Next.js) and the API (Laravel) are separate services. Bearer tokens kept in `localStorage` can be stolen by any XSS. Cross-origin cookies need CORS with credentials and `SameSite=None`, which is fragile and widens the CSRF surface.

## Decision

- The browser only talks to the Next.js origin. Rewrites in `next.config.ts` proxy `/api/*` and `/sanctum/*` to Laravel.
- Laravel Sanctum runs in **stateful SPA** mode: an encrypted, `HttpOnly`, `SameSite=Lax` session cookie, with Redis as the session store.
- Every mutating request first ensures the `XSRF-TOKEN` cookie exists and echoes it in `X-XSRF-TOKEN` (`apps/web/src/lib/api.ts`).
- Login is throttled per email + IP (5 attempts/minute). The session is regenerated on login and invalidated on logout.
- Any `401` seen by TanStack Query refetches `/auth/me`, so an expired session lands on the sign-in page instead of a broken screen.

## Consequences

- No tokens are exposed to JavaScript, and no CORS configuration is needed.
- In production, both services sit behind one domain (or the web app proxies the API), which the compose setup already models.
- A future mobile client would use Sanctum personal access tokens, a separate guard added when needed.
