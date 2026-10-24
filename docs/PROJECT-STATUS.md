# MNT (منظمتي) — project status and handover

> **Status: paused on 2026-10-24** at the request of the project lead.
> Everything is committed and pushed and CI is green. This file is the single place to pick the work back up:
> what the product is, every decision taken, what exists, how it works, and what comes next.

---

## 1. The idea in one paragraph

MNT (short for **منظمتي**, "my organisation") is a multi-tenant web SaaS for NGOs, associations and donor-funded programmes in Mauritania and the region. They run on spreadsheets, WhatsApp and paper today. MNT gives them one traceable place for **projects, donors and grants, budgets, expenses with an approval chain, plain-language reports**, plus simple **operations** (purchasing, staff, assets, archive). Arabic first (RTL), then French and English. It was inspired by an MCS Consulting brochure (the PDF in the repo root is third-party and git-ignored; it is not ours).

**The guiding rule from the client (MCS):** extreme simplicity for non-technical users. Screens speak in sentences ("المشروع اكتمل بنسبة 90%… ميزانيته… صرفنا… بقي…"), important figures go on top, and there is no colour mixing (one green).

## 2. Decisions taken (do not re-open without a reason)

| Topic | Decision |
|---|---|
| Product | Our own SaaS product, multi-tenant |
| Tenancy | One shared PostgreSQL database with **Row-Level Security** (`app.org_id` / `app.user_id` session settings) plus an Eloquent global scope |
| Stack | Laravel 12 API (PHP 8.4, FrankenPHP) and Next.js 16 / React 19 web app in one monorepo; everything runs in Docker |
| Auth | Sanctum SPA cookie session, same-origin through Next rewrites (`/api/*`, `/sanctum/*` → `api:8000`) |
| Languages | AR (default, RTL), FR, EN; next-intl on the web, `lang/*.json` + `lang/*/fields.php` on the API |
| Money | **One currency per organisation**, fixed at creation; amounts stored as **bigint minor units** (1 MRU = 100), shown in whole units with Latin digits |
| Costing | An expense can be split across budget lines by **percentage** (shares sum to 100) |
| Approval | Fixed chain: **submit → accountant reviews the invoice → director approves**; three different people; reject possible at each step |
| Identity | Name **MNT**, Arabic wordmark منظمتي; **deep green** `#0E5A44` / night `#0A3D2F`; tile monogram logo (`docs/brand/mnt-tile`). The earlier Lapis-blue ligature is superseded. |
| Visual reference | The design validated by the client, made with Claude Design. Its sources are in **`docs/design/reference/*.dc.html`** (Main = login, Dashboard, Projects, Project, Donors, Expenses, Reports, Team, Settings, Mobile). |
| Fonts | Readex Pro (display, figures) + IBM Plex Sans Arabic (text); body text never below 16 px |
| Later milestones | Double-entry accounting, donor read-only portal, configurable approval engine, multi-currency (declined) |

## 3. What exists today

### Product modules (all live in the web app)

| Area | What it does |
|---|---|
| Auth & onboarding | Register, login, create an organisation (country, currency, language, fiscal year) |
| Dashboard | Hero sentence (received / spent / balance), 4 figures, **"needs your attention"** (expenses waiting for *you*, donor reports due within 45 days, budgets above 80 %), project progress, latest expenses |
| Projects | Stats on top (count by status, total budget), project cards with the plain-language spent/left story |
| Project page | Progress ring and story, **activities** checklist ("4 of 5 done"), funding (grants and tranches), where the money went (budget lines, spent per line), latest expenses; edit project, budget lines, grants |
| Donors & funding | Summary sentence, a card per donor (promised / received / left, projects, next tranche), **reports owed to donors** (mark as sent, add) |
| Expenses | Month switcher, month summary, list with status filter, detail panel with the **approval path**, invoice download, decide (review / approve / reject with a reason), submitter edits or withdraws before review; new expense with percentage split and invoice upload |
| Reports | Monthly narrative written from the data, figures, 6-month received/spent chart with tooltips and a table view, print to PDF |
| Team | The approval chain (who submits, reviews, approves), member cards with what each person can do; **invite by e-mail** (consent-based, see §5) |
| Settings | Organisation details (currency fixed), personal language, my organisations, change password, sign out |
| Operations | **Purchasing** (request → approved by someone else → ordered → received / cancelled), **Staff** (contracts; salaries and payroll visible to HR only), **Assets** register (tag, holder, condition, value), **Archive** (contracts, reports, letters with private scans, search) |
| Admin | Roles & permissions, **audit trail** (append-only, written as sentences, money and dates formatted) |

### Numbers

- 71 commits on `main`, CI green (API: Pest, Larastan level 8, Pint; web: ESLint, `tsc`, `next build`).
- **69 API feature tests** (tenancy isolation including raw SQL RLS, permissions, approval chain and segregation of duties, allocations, grants and tranches, dashboard and report figures, invitations, operations, settings).

## 4. Architecture map

```
apps/api (Laravel 12)
  app/Domain/
    Tenancy/        TenantContext (set_config), BelongsToOrganization (scope + stamp), RowLevelSecurity (migration helper)
    Organizations/  Organization, Membership (seat + roles + permissions), CreateOrganization, InviteMember
    Access/         Permission enum (= Gate abilities), SystemRole (7 default roles + their permissions), Role
    Audit/          AuditLog (DB trigger blocks UPDATE/DELETE), RecordsAudit trait (hidden attributes never logged)
    Projects/       Project (+ scopeWithFinancials), ProjectActivity
    Grants/         Donor, Grant (+ syncTranches), GrantTranche, DonorReport
    Budgets/        BudgetLine (+ scopeWithSpent)
    Expenses/       Expense, ExpenseAllocation, ExpenseStatus, Actions/SaveExpense (numbering lock, private upload), Actions/ExpenseWorkflow (chain, locks, allowedActions)
    Reports/        FinanceSummary (dashboard + monthly report: one source of truth for figures)
    Operations/     PurchaseRequest (FLOW map), Employee, Asset, Document
  app/Http/         thin controllers, Form Requests, API Resources; error contract { message, code, errors? } in bootstrap/app.php
  routes/api.php    /auth/*  and  /orgs/{organization}/*  (ResolveOrganization middleware enters the tenant; 404 for non-members)
  database/seeders  DemoSeeder + DemoExpenseChain (local/testing only)

apps/web (Next.js 16, App Router, Turbopack)
  src/app/[locale]/(auth)/{login,register,invitation}
  src/app/[locale]/onboarding
  src/app/[locale]/[organization]/{page (dashboard), projects, projects/[project], donors, expenses, reports,
                                   members (team), settings, purchases, staff, assets, archive, roles, audit}
  src/features/     auth, organization (app-shell, navigation, context), finance (queries, ui primitives, dialogs),
                    projects, donors, operations (generic list/save hooks, page frame), audit
  src/lib/          api.ts (CSRF, retries), money.ts (minor units, Latin digits), types.ts
  messages/{ar,fr,en}.json
```

**Permissions** (role → abilities): Admin has everything. Director has final approval and documents. Accountant reviews invoices, plus grants, budgets and purchasing. Coordinator manages projects, submits expenses and requests purchases. HR officer manages staff and salaries. Logistician handles purchasing and assets. Donor viewer can view projects only and has no access to operations. `operations.view` hides internal records from donors.

## 5. Security rules already built in (keep them)

- RLS on every tenant table, plus explicit org-scoped `exists` validation, because RLS lets a user see their *own* seats in other organisations.
- Segregation of duties: a submitter never reviews or approves their own expense, the reviewer is not the approver, and a purchase is never approved by its requester. Every decision re-reads the row under `lockForUpdate`.
- Edits and withdrawals re-check editability on a locked row, so they can't race a review.
- Files (invoices, scans) live on the **private** disk and are streamed only after an authorisation check. Paths never appear in the API or the audit trail. Replaced scans are kept.
- Invitations are **consent-based**: every seat starts `invited` (no access) and only its owner accepts or declines it. The e-mailed link only sets a password (7-day `invitations` broker), and names are Markdown-escaped in the mail.
- Salaries are hidden from non-HR users and from the audit trail. The DemoSeeder refuses to run outside local/testing.

## 6. Run it

```bash
docker compose up -d                       # api, queue, web, pgsql (5433), redis, mailpit (8025)
docker compose exec api php artisan migrate:fresh --seed --seeder='Database\Seeders\DemoSeeder' --force
open http://localhost:3000/ar/al-amal      # demo tenant (stable slug)
```

Demo accounts (local only, password `MntDemo-2026`): `admin@`, `director@`, `accountant@`, `coordinator@`, `hr@`, `donor@` + `demo.mnt.test`.
The demo data mirrors the design: 16 M promised, 13 M received, 10.55 M spent, 2.45 M balance; in October, 14 approved expenses (1.25 M), 3 waiting (340 k) and 1 rejected; EU report due 15 November.

Checks: `docker compose exec api php artisan test` · `vendor/bin/phpstan analyse` · `vendor/bin/pint` · `docker compose exec web sh -c "npx tsc --noEmit && npx eslint src"`.
**Before pushing web changes, run a production build** (`next build`). CI runs it, and pages that read `useSearchParams` outside a dynamic segment need a `<Suspense>`.

## 7. Gotchas learned the hard way

- PHP in Docker only (never brew). Generate `package-lock.json` inside `node:24` (Linux), or `npm ci` fails in CI.
- The container env overrides phpunit `<env>`: tests force `DB_DATABASE=mouna8amti_testing`, and `TestCase` refuses any other DB (once wiped the dev DB).
- `migrate:fresh` does not drop SQL functions, so use `CREATE OR REPLACE FUNCTION`.
- Route-model binding needs the tenant first: `ResolveOrganization` is placed before `SubstituteBindings`.
- Next dev in Docker needs `NEXT_WATCH_POLL_MS`, and CSS changes sometimes need `docker compose restart web`.
- next-intl keys cannot contain dots. Arabic digits: use the `ar-u-nu-latn` locale (see `lib/money.ts`, `useDates`).
- After a reseed, an old browser session gets a 401 on its first auth call (Sanctum `AuthenticateSession`). The API client retries auth POSTs once.
- RLS writes need the target org entered (WITH CHECK): enter the tenant before updating a seat of another org.
- Git hygiene for this repo: no AI co-author trailers in commits; `.claude/` and `CLAUDE.md` are never pushed (`.git/info/exclude`). Old commits from 2026-10-21 still carry a trailer, so a history rewrite is pending if wanted.

## 8. Known gaps and next steps (in the order I would do them)

1. **Polish pass**: README with new screenshots (the current ones predate the green redesign), mobile check of every screen (dashboard and expenses verified at 420 px), dark mode review, an empty-state demo for a brand-new organisation.
2. **Notifications** (designed in Settings, not built): e-mail when an expense waits for me, a reminder two weeks before a donor report, a budget line at 90 %, and a weekly summary.
3. **Donor read-only portal** (the donor viewer role exists; needs a scoped view of *their* projects only).
4. **Exports**: PDF/Excel for projects, donors, expenses and budget (the design lists these four reports; only the monthly report prints today).
5. Purchase → expense link (create the expense from a received purchase), quotes and suppliers list.
6. HR: leave requests and attendance. Assets: movements and periodic inventory.
7. M2 deep finance: double-entry accounting (chart of accounts, journals, trial balance).
8. Ops: deployment (Docker images, reverse proxy, backups), landing page, rename `mouna8amti` repo/DB identifiers to MNT if desired.

Deliberate simplifications to revisit only if needed: a fixed approval chain (not configurable), unpaginated grants, integer-division rounding in per-line spent, and one page of 25 projects with client-side filters.

## 9. Related material outside the repo

- Validated design (shared link for the client): `https://claude.ai/artifact/KJo76vxH43q4q8hsAGZ419` (viewers need a Claude login).
- Design videos (desktop + truly responsive mobile): external disk `AB` → `ProgerTech/videos/mnt-design/`.
- Arabic features brochure PDF: Desktop, `منظمتي - الوظائف الرئيسية.pdf`.
- Product spec (original M1 scope): `docs/specs/2026-10-21-mouna8amti-design.md`; ADRs in `docs/adr/`; design tokens in `DESIGN.md`; brand in `docs/brand/README.md`.
