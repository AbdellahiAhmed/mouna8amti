# ADR 0002: Permissions as a code-defined catalogue

- **Status:** Accepted, 2026-10-21

## Context

Organisations need default roles (Director, Accountant, Donor viewer…) and the freedom to adjust them. The obvious design is `permissions` + `role_permission` tables. But permissions only matter where code checks them. A permission row with no `Gate` check behind it does nothing.

## Decision

- The catalogue is a PHP enum, `App\Domain\Access\Enums\Permission`. Its string values (`expenses.approve`) double as Gate ability names.
- A role stores its granted permissions as a `jsonb` array. There is no join table.
- One `Gate::before` hook resolves every catalogue ability against the **current membership**, not the user. The same person can be Director in one organisation and Donor viewer in another.
- `SystemRole` defines the 7 default roles, their translated names and their permissions. They are created during onboarding.

## Consequences

- Adding a permission is a code change, reviewed alongside the check that uses it.
- There are two fewer tables and no sync job between the database catalogue and the code.
- If a permission is renamed later, a data migration must update the `roles.permissions` arrays.
- Scoping a role to a single project, planned in the spec, will add a nullable `project_id` to `membership_role` when projects land.
