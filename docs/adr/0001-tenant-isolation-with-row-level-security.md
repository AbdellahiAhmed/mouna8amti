# ADR 0001: Tenant isolation with PostgreSQL Row-Level Security

- **Status:** Accepted, 2026-10-21

## Context

Mouna8amti hosts many NGOs in one deployment. A leak between tenants would expose one organisation's donors, budgets and staff to another. That is the worst failure this product can have. Three options were considered:

| Option | Isolation | Operational cost |
|---|---|---|
| Database per tenant | Physical | Migrations × N, dynamic connections, harder cross-tenant features (donor portal) |
| Schema per tenant | Strong | Same issues, slightly lighter |
| Shared tables + `organization_id` | Only as good as every query | Minimal |

## Decision

We use shared tables with `organization_id`, enforced **twice**:

1. **Application:** the `BelongsToOrganization` trait adds a global scope and stamps `organization_id` on insert.
2. **Database:** every tenant table has `ENABLE` + `FORCE ROW LEVEL SECURITY`. A `tenant_isolation` policy compares `organization_id` with `app_current_org_id()`, which reads the `app.org_id` setting. `TenantContext::enter()` sets that value for each request.

Supporting rules:

- The application connects as a **non-superuser** role (`docker/postgres/init.sql`). Superusers bypass RLS.
- `FORCE` is required because that role owns the tables, and owners bypass RLS otherwise.
- Without a tenant, `app_current_org_id()` is `NULL`, so queries return nothing (fail closed).
- `WITH CHECK` rejects writes into another tenant even if application code supplies a foreign id.
- A user's own memberships and role definitions are readable across tenants through `app.user_id`, so `/me` can list every organisation they belong to.

## Consequences

- A forgotten `where` clause, a raw query or a future reporting endpoint cannot read another tenant's rows.
- Tests must run as the same non-superuser role, otherwise RLS is silently off. CI recreates the role for that reason.
- Background jobs must call `TenantContext::enter()` explicitly. Without it they see nothing, which is the safe failure.
- Non-members asking for an organisation get **404**, never 403, so existence is not revealed.
