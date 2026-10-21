# Mouna8amti (منظمتي) — Product & System Design

- **Status:** Approved (brainstorming session, 2026-10-21)
- **Owner:** Abdellahi Ahmed
- **Scope of this spec:** whole product vision + detailed design of Milestone 1

## 1. Problem

NGOs, associations and donor-funded programmes in Mauritania and the wider
region run their operations on spreadsheets, WhatsApp groups and paper
binders. The consequences are concrete:

- Nobody can say, today, how much of a grant budget line is left.
- Expense approvals happen informally and leave no trace for auditors.
- Donor reports take days of manual consolidation.
- Directors cannot follow anything when they are away from the office.

Mouna8amti is a multi-tenant SaaS that gives these organisations one
traceable, auditable, donor-ready system — in Arabic, French and English.

## 2. Users

| Role (system default) | Main job in the product |
|---|---|
| Admin | Configures the organisation, users, roles, workflows |
| Director | Oversees everything, final approval above thresholds |
| Accountant | Verifies expenses, manages budgets (accounting in M2) |
| Project coordinator | Runs projects, submits and pre-approves expenses |
| HR officer | Staff, contracts, leave (M3) |
| Logistician | Procurement, assets, stock (M2/M3) |
| Donor viewer | Read-only access to the projects they fund (M4 portal) |

Organisations can create custom roles from a fixed permission catalogue.
A role can be granted organisation-wide or scoped to a single project.

## 3. Milestones

| Milestone | Content |
|---|---|
| **M1 — Foundation + financial spine** | Org onboarding, auth, roles & permissions, approval engine, audit log, real-time notifications, ⌘K palette, Projects, Donors & grants, Budgets, Expenses, Dashboard |
| M2 — Deep finance | Double-entry accounting (chart of accounts, journals, auto-generated entries, ledger, trial balance), Procurement (request → quotes → PO → receipt) |
| M3 — Operations | HR (employees, contracts, attendance, leave), Assets & stock |
| M4 — Accountability | Correspondence & archive, PDF/Excel reports, read-only donor portal |
| M5 — Showcase | Animated landing site, seeded demo tenant, portfolio README, deployment |

## 4. Architecture

```
mouna8amti/
├── apps/api        Laravel 12 · PostgreSQL 16 (RLS) · Redis · Reverb · Sanctum (SPA cookie) · Pest
│   └── app/Domain/{Organizations,Access,Approvals,Projects,Grants,Budgets,Expenses,Audit}
├── apps/web        Next.js (App Router) · TypeScript strict · Tailwind v4 · Radix · Motion · next-intl
│   └── src/{app/[locale], components/ui, features/<module>, lib}
├── docker-compose.yml   pgsql, redis, mailpit
└── .github/workflows    lint + static analysis + tests + build per app
```

Decisions:

- **Tenancy:** shared database, `organization_id` on every business table,
  enforced twice — Eloquent global scope + PostgreSQL Row-Level Security
  keyed on `current_setting('app.org_id')`, set per request. A bug in
  application code cannot leak another organisation's data.
- **Backend organised by business domain**, each with its models, actions,
  policies, form requests and API resources. Controllers stay thin.
- **Approval engine and audit are cross-cutting**; every module plugs in.
- **Money is stored as `bigint` minor units**, never floats.
- **One currency per organisation.** Shared costs are split across budget
  lines by percentage.
- **Auth:** Sanctum stateful SPA cookies (no tokens in localStorage).

## 5. Data model (M1)

### Tenancy & access

```
organizations      id, name, slug, legal_name, country, currency, locale, fiscal_year_start_month, logo_path, settings jsonb
users              id, name, email, password, locale, avatar_path, last_login_at     (global: a user can belong to several orgs)
memberships        id, organization_id, user_id, status(invited|active|suspended), title
roles              id, organization_id, key, name jsonb(ar,fr,en), permissions jsonb, is_system
membership_role    organization_id, membership_id, role_id   (+ project_id NULL with M1 projects: NULL = org-wide)
```

Permissions are a code-defined enum stored on the role as a jsonb array, with no
join table (see ADR 0002).

```
```

### Projects & funding

```
donors                 id, organization_id, name, type(multilateral|bilateral|foundation|government|private|other), country, contact_name, contact_email
grants                 id, organization_id, donor_id, reference, title, amount, signed_on, starts_on, ends_on, status(draft|active|closed)
grant_tranches         id, grant_id, expected_on, expected_amount, received_on, received_amount
reporting_obligations  id, grant_id, kind(narrative|financial), due_on, submitted_on
projects               id, organization_id, code, name, description, manager_membership_id, starts_on, ends_on, status(draft|active|on_hold|closed), progress
grant_project          grant_id, project_id, allocated_amount
activities             id, project_id, name, starts_on, ends_on, status, progress
```

### Budgets & expenses

```
budget_lines         id, organization_id, project_id, grant_id NULL, code, category(personnel|equipment|activities|services|admin|other), label, planned_amount
expenses             id, organization_id, number (EXP-2026-0042), payee, description, total_amount, spent_on, payment_method, status, submitted_by
expense_allocations  id, expense_id, budget_line_id, percentage (basis points), amount
attachments          id, organization_id, attachable (morph), path, mime, size, original_name, uploaded_by
document_sequences   organization_id, kind, year, last_number                     (gapless numbering under row lock)
```

### Approval engine

```
approval_workflows  id, organization_id, subject_type, name, is_active
approval_steps      id, workflow_id, position, role_id, min_amount NULL           (step skipped below threshold)
approval_requests   id, organization_id, approvable (morph), workflow_id, current_position, status(pending|approved|rejected|cancelled)
approval_decisions  id, approval_request_id, approval_step_id, decided_by, decision(approved|rejected|returned), comment, decided_at
```

### Audit

```
audit_logs  id, organization_id, actor_id, event, auditable (morph), old_values jsonb, new_values jsonb, ip, user_agent, created_at   (append-only)
```

### Rules

- Every business table has a composite index starting with `organization_id`
  and an RLS policy.
- Statuses are PHP backed enums mirrored by `CHECK` constraints.
- **Budget figures per line:** planned; committed = Σ allocations of pending
  expenses; consumed = Σ allocations of approved/paid expenses;
  remaining = planned − consumed.
- Document numbers are sequential per organisation, kind and year, gapless.
- Soft deletes only on reference data (donors, projects). Approved expenses
  are immutable: they are voided, never deleted.

## 6. Business flows

### Organisation onboarding

Sign up → 4-step wizard: identity (name, logo, country) → currency, language,
fiscal year → invite team → first project (optional). One transaction
creates the organisation, the 7 system roles, the default expense workflow
(Coordinator → Accountant → Director above a threshold) and the Admin
membership.

### Expense lifecycle

```
draft ──submit──▶ pending ──(all steps approved)──▶ approved ──pay──▶ paid
                    │  ├─reject──▶ rejected   (final, reason required)
                    │  └─return──▶ draft      (sent back with comment)
                    └─cancel (author)──▶ cancelled
approved ──void (Director, reason)──▶ voided
```

Submission requires: at least one attachment, allocations summing to 100 %,
budget lines belonging to active projects, a date inside the fiscal year.
Overspending does not block by default — the expense carries an
"over budget" flag visible to approvers; an organisation setting makes it
blocking.

### Approval engine

- A generic `ApprovalService` works on any model implementing `Approvable`
  (amount, requester, subject).
- On submit it resolves the applicable steps (threshold-aware) and opens a
  request.
- On each decision it checks the decider holds the step's role (project
  scope respected) and is not the requester (segregation of duties), records
  the decision, then advances or finalises.
- Every transition dispatches a domain event → audit entry, real-time
  notification to the next approvers and the requester, queued email.
- Concurrency: the request row is locked (`SELECT … FOR UPDATE`) so two
  simultaneous approvals cannot skip a step.

### Error contract

- API error shape: `{ message, code, errors? }`.
- 422 validation · 403 missing permission · 404 not found **and** resource of
  another organisation (existence is not revealed) · 409 invalid state
  transition.
- Front-end: inline translated field errors, toasts for server errors,
  per-module error boundaries, illustrated empty states, skeleton loading,
  offline banner.
- Uploads: PDF, images, Office documents; 10 MB max; MIME checked server-side;
  private storage; temporary signed download URLs.

## 7. Design system & experience

- **Concept:** clarity in the service of trust. Apple/Notion restraint with
  its own signature: an 8-point Islamic geometric star (echoing the "8" in
  Mouna8amti) used sparingly — login background, empty states, PDF watermark.
- **Light by default**, carefully crafted dark mode.
- **Palette (OKLCH tokens):** ink `#0B1220`, warm paper `#FAFAF7`,
  primary deep teal `#0F766E`, secondary sand gold `#C8A24A` used sparingly,
  semantic success/warning/danger/info.
- **Typography:** Readex Pro (display, Arabic + Latin), IBM Plex Sans Arabic
  (body, tables, figures) with tabular numerals. Base 16 px, tables 15 px,
  never below 13 px; display sizes up to 48–56 px. Line height 1.7 for
  Arabic, 1.55 for Latin.
- **Motion:** Motion library with three easings and three durations
  (120/220/400 ms). Direction-aware page transitions, shared-layout
  transitions, animated KPI counters, budget bars that fill on reveal,
  step-by-step approval timeline. Decorative effects (React Bits style) only
  on landing, login, onboarding and empty states — never on work screens.
  `prefers-reduced-motion` respected.
- **Components:** Button, Input, Select, DatePicker, DataTable (server
  sort/filter/paginate), Sheet, Dialog, Command palette, Toast, StatusBadge,
  BudgetBar, ApprovalTimeline, StatCard, EmptyState, FileDropzone,
  MoneyInput. Documented on an internal `/design-system` page.
- **RTL & i18n:** next-intl; CSS logical properties only; mirrored
  directional icons; `Intl` formatting; Latin digits by default with an
  Arabic-Indic option.
- **Logo:** geometric symbol (8-point star opening onto a stylised «م») +
  bilingual wordmark منظمتي / Mouna8amti, delivered as clean SVG.

## 8. Quality

- **API (Pest, real PostgreSQL):** tenant isolation (API and raw SQL under
  RLS), approval engine (thresholds, segregation of duties, return, concurrent
  decisions), allocation maths (100 %, rounding without losing a unit),
  budget figures, endpoint permissions, audit on every transition, gapless
  numbering.
- **Web:** Vitest + Testing Library on MoneyInput, AllocationEditor,
  ApprovalTimeline; Playwright for onboarding, full expense cycle,
  AR ↔ FR switch.
- **Static quality:** Pint + Larastan; ESLint + `tsc --strict`.
- **CI:** GitHub Actions on every push/PR; red on any failure.
- **Git:** public repo `mouna8amti`, conventional commits in English, one
  commit per logical unit.
- **Demo seed:** «منظمة الأمل للتنمية» with 5 projects, 4 donors, expenses at
  every stage, one account per role.

## 9. Out of scope for M1

Multi-currency, payroll, double-entry accounting, procurement, HR, assets,
donor portal, PDF reporting, mobile app, SSO. Each is placed in a later
milestone above or deliberately excluded.
