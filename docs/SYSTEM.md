# System description

What the system does, how it is built, the rules it enforces, how it was checked, and what it does **not** do. Written against the code as committed; where a number is given (endpoints, tests, models) it was counted from the repository.

## 1. Purpose

Collect ESG (Environmental, Social, Governance) data from portfolio companies, have it reviewed twice, calculate emissions from it, and report progress against targets. Every change is recorded.

## 2. Architecture

| Part | Technology | Notes |
|------|------------|-------|
| API | NestJS 11, TypeScript, Prisma 6, PostgreSQL | REST under `/api`; JWT bearer auth; 29 models, 15 enums, 7 migrations |
| Web | React 19, Vite, Tailwind 4, TanStack Query/Table, Recharts, react-hook-form | Single-page app; fonts bundled (no external requests) |
| Jobs | `@nestjs/schedule` inside the API process | Daily 06:00 server time |
| Files | Local disk (`UPLOAD_DIR`) | Random file names; original name only used as the download name |
| Mail | nodemailer | Logs instead of sending when `SMTP_HOST` is unset |

`apps/api/src` is organised by feature: `auth`, `users`, `audit`, `master-data`, `formula`, `data-request`, `calculation`, `report`, `performance`, `dashboard`, `registers`, `minutes`, `mail`, `common`. Generic list/create/update/delete (with audit logging and uniform error mapping) lives in `common/crud.service.ts` and `common/crud.controller.ts` and is reused by 16 resources.

## 3. Roles and access

Every endpoint requires a login except `GET /health` and `POST /auth/login`. A user's role and active flag are re-read from the database on **every request**, so deactivating a user or changing a role takes effect immediately.

| Role | Can |
|------|-----|
| `ADMIN` | everything, including user accounts |
| `ESG_TEAM` | master data and settings; create/edit/delete registers, targets, minutes; send and review data requests; run calculations; see all reports |
| `INVESTEE` | fill in, attach files to and submit data requests of **their own company only**; see their own dashboard |
| `VIEWER` | read-only: lists, reports, dashboards, audit trail |

An automated check calls all 112 endpoint/method combinations as anonymous, investee, viewer, ESG team and admin (561 calls) and compares each answer with the table above. Result: **no endpoint is open to a role that should not have it, and none returns a server error.**

## 4. Data collection and review

### 4.1 Metric selection
Each company has versioned selections of metrics. At most one version per company is active; activating one deactivates the others; the active version cannot be deleted. Creating a version computes the next number inside a transaction and retries if two people create one at the same moment.

### 4.2 Data requests
- **Periodic**: created by the daily job from a company's *capture schedule* (monthly, quarterly or annual) for the last fully finished period, once per company/frequency/period.
- **Ad hoc**: created by the ESG team; notes are required.
- Creating a request copies the company's active metric selection into empty value rows (a snapshot). A company without an active selection is refused. The due date cannot be before the period starts; the period must end on or after it starts.

### 4.3 Status flow

```
NOT_STARTED ──save──▶ ON_GOING ──submit──▶ SUBMITTED (review level 1)
                          ▲                      │ approve
                          │                      ▼
                   NEED_REVISION ◀── revise ── SUBMITTED (review level 2) ──approve──▶ APPROVED
                          └──────────── (either level can send back) ────────────────────
```

Rules enforced by the server:
- Only the three editable statuses accept value changes or attachments; a submitted request is locked.
- **Submit** needs every metric filled. The check is repeated inside the same transaction that locks the request.
- **Review** needs remarks. The second reviewer must be someone who did **not** approve level 1 at any point since the latest submission (not only the most recent approver).
- Every transition is an atomic claim: the update only succeeds if the request is still in the state that was read. Two people acting at once get one success and one `409`, never two approvals.
- Investees can only reach requests of their own company.

### 4.4 Numbers typed into requests
For a metric with a unit the only accepted forms are `1234.5`, `-3` and `1,234.5` (a comma is a thousands separator, never a decimal point). `12,5`, `1.234,5`, `1e3`, `0x10` are refused with an explanation; the form shows the same rule while typing and blocks saving until fixed. Numbers are stored canonically (`1234.5`). Text answers (no unit) are stored exactly as typed.

### 4.5 Attachments
Extensions allowed: pdf, png, jpg/jpeg, xlsx, xls, docx, doc, csv, txt; maximum 10 MB. Downloads are always sent as attachments with `nosniff`. Attachments can only change while the request is editable.

### 4.6 Notifications and reminders
Emails go to company contacts and users on a new request, to the first reviewers on submission (`1st_reviewer` setting), to the second reviewers after level 1 (`2nd_reviewer`), and to the company on the final outcome. Reminders go out when the due date is within three days or past, at most once a week per request. A mail failure is logged and never fails the request.

## 5. Calculation

- Only **approved** requests can be calculated. Every run is kept; the newest is the one used by reports and the dashboard.
- A metric has an **input unit** (what the company types, e.g. kWh) and, if a formula converts it, a **result unit** (e.g. tCO₂-e). Only results in tCO₂-e with a Scope 1–3 count toward greenhouse-gas totals; other results are shown separately with their own unit.
- **Formulas** use `+ - * / ^`, parentheses, numbers and variable names (optionally `{braced}`). They are parsed by a small hand-written parser, never `eval`. Variables must be a data-input attribute, an emission factor or a base-year code; saving a formula with an unknown name is refused.
- The company's single value for a metric feeds the formula's single data-input variable. Emission factors are looked up for the year the reporting period ends in (the latest value on or before that year). A formula with more than one data input is reported as an error on that line.
- Results are rounded to 15 significant digits to remove floating-point noise (0.1 + 0.2 → 0.3). Stored with six decimals. This is double-precision arithmetic, not exact decimal arithmetic.
- Each result line keeps a copy of the names, units, scope, formula and every variable value used, so it stays explainable after master data changes. A line that cannot be calculated carries its error instead of failing the run; the report warns that totals may be incomplete.

## 6. Targets, ESG index and indicators

- A **target** is per company, metric and year, either "at most" or "at least" a value.
- A metric's **yearly figure** combines its approved periods ending in the year by its aggregation rule (sum, average or latest). A calculated metric is measured by its calculation result.
- **Attainment** = 100% when the target is met or beaten, otherwise the shortfall as a share of the target (for "at most": target ÷ actual). Status: met ≥ 100, at risk ≥ 80, off track below. A zero target is met only by zero.
- A **pillar index** is the mean attainment of that pillar's targets that have data. The **ESG index** is the mean of the pillar indices that exist. It is a progress measure for this organisation, not an external rating or a weighted score.
- **Risk indicators** come from the registers: serious open incidents, overdue open audit findings, risks scored ≥ 15 (likelihood × impact), and the share of applicable compliance items that are fully compliant.

## 7. Reports and exports

- **ESG Output Report**: per approved request: emission totals by scope with percentages, emissions by source, charts, social and governance answers, review history, attachments; PDF export (generated on the server).
- **Consolidated report**: a company plus its direct subsidiaries for a calendar year, a plain sum of every approved request ending in that year (no ownership weighting). Overlapping ad hoc periods would be counted twice; the screen says so.
- **Audit trail**: filter by object and date; export to Excel (one row per changed field, at most 20,000 changes per export).

## 8. Data model (29 models)

| Area | Models |
|------|--------|
| Accounts and audit | `User`, `AuditLog`, `AuditLogLine` |
| Organisation | `Company` (parent/child tree), `CompanyContact`, `Project` |
| Catalog | `EsgTheme`, `EsgMetric`, `DataInputAttribute`, `EmissionFactor` + `EmissionFactorValue`, `BaseYearGhg`, `Formula`, `AppConfig` |
| Selection | `MetricMapping`, `MetricMappingItem` |
| Collection | `DataRequest`, `DataRequestValue`, `DataRequestAttachment`, `ReviewApproval`, `CaptureSchedule` |
| Results | `CalculationRun`, `CalculationResultLine` |
| Monitoring | `MetricTarget`, `Incident`, `AuditFinding`, `Risk`, `ComplianceItem`, `MinutesOfMeeting` |

Branches and plants are modelled as subsidiary companies.

## 9. API surface

39 hand-written routes plus 16 resources with the same five operations (list, get, create, update, delete): `companies`, `projects`, `esg-themes`, `esg-metrics`, `data-input-attributes`, `emission-factors`, `base-year-ghg`, `configs`, `formulas`, `metric-mappings`, `capture-schedules`, `targets`, `incidents`, `audit-findings`, `risks`, `compliance-items`. Reading is open to ESG team and viewers; writing to the ESG team (and admin). Lists take `page`, `pageSize` (max 500, default 10), `q` (text search) and per-resource filters. Custom routes: auth (`login`, `me`), `users`, `data-requests` (+ `values`, `submit`, `review`, `attachments`, `jobs/run`), `calculations`, `reports` (`request/:id`, `request/:id/pdf`, `consolidated`), `dashboard`, `dashboard/esg`, `minutes` (+ `attachment`), `audit-logs` (+ `export`), `formulas/simulate`, `health`.

Errors: `400` validation, `401` not signed in, `403` role, `404`, `409` conflict (duplicate code, record in use, or a concurrent change), `429` too many login attempts.

## 10. Security controls

- Passwords hashed with bcrypt (10 rounds), 8–64 characters; login limited to 10 attempts per minute per address (`LOGIN_RATE_LIMIT`); 600 requests per minute overall.
- Helmet security headers; CORS restricted to `CORS_ORIGIN`; in production the API refuses to start with a missing, example or short (<32) `JWT_SECRET` or without `CORS_ORIGIN`.
- Request guard answers `400` for repeated query parameters and NUL bytes instead of failing deeper in.
- Inputs validated with whitelisting (unknown fields are dropped); dates must be real calendar days (`2024-02-31` is refused, not rolled over); enum filters accept only real values.
- Password hashes are never selected into responses or audit entries.
- Dependency audit: after pinning `multer` ≥ 2.5 and `uuid` ≥ 11.1.1 (overrides in the root `package.json`), `npm audit --omit=dev` reports 3 findings, all in Prisma's command-line tooling (`prisma`, `@prisma/config`, `deepmerge-ts`). They are not used while the server runs; clearing them needs the Prisma 7 major upgrade.

## 11. How it was checked

| Check | Result |
|-------|--------|
| Type-check (API and web) | clean |
| Automated tests | 106 passing in 17 suites: formula engine, number and date parsing, review workflow, period maths, performance/index maths, report summary, PDF generation, catalog integrity, request guard, CRUD helper, concurrency paths |
| Authorization matrix | 561 calls, 0 problems |
| Live probes (odd numbers, races, dates, paging, injection-style search text, weird ids, repeated parameters) | 0 server errors after fixes |
| Browser, every page as admin | 12 of 12 render, no console errors; investee redirected from every page they may not open |
| Production build | passes |

### Bugs found by this review (all fixed, each with a regression test)
| # | Severity | Problem | Fix |
|---|----------|---------|-----|
| 1 | High | `1.234,5` was stored as `1.2345` and `12,5` as `125`; text answers lost their commas | Strict number rules (§4.4); text left alone |
| 2 | High | Two reviewers could approve level 1 simultaneously, and the "different second reviewer" rule only checked the latest approver | Atomic claim of each step; rule covers every level-1 approver in the cycle |
| 3 | Medium | A save landing just after a submit could change locked data | Save claims the request first; submit re-checks completeness in its transaction |
| 4 | Medium | Creating two metric selections at once failed with a 500 | Retry on the unique version number |
| 5 | Medium | 7 query shapes caused 500s (`?status=toString`, repeated parameters, NUL in an id) | Own-property enum checks and request guard |
| 6 | Medium | Impossible dates such as `2024-02-31` were accepted and silently became 2 March | Strict calendar-date validation everywhere |
| 7 | Low | A company could be its own parent or sit inside its own branch | Parent check on create/update |
| 8 | Low | Due date before the period began was accepted; 100,000-character passwords accepted | Rejected; passwords capped at 64 (login 128) |
| 9 | Low | `0.1 + 0.2` displayed as `0.30000000000000004` | Results rounded to 15 significant digits |
| 10 | Low | Vulnerable `multer` and `uuid` versions | Patched versions pinned |

## 12. Known limits (read before relying on it)

**Cannot be guaranteed.** "No bugs" cannot be proven. The checks above found and removed every defect they could reach; they did not cover everything listed here.

- **No browser-automation suite.** Pages were checked by hand and by script, not by a repeatable end-to-end test run. The bulk restyle was verified on list pages and a data-entry page, not every dialog.
- **Race coverage is by design plus live probes** for review, submit, save and version creation. Attachment upload/removal racing a submission is not atomically guarded.
- **Sessions**: tokens last 8 hours, are kept in the browser's local storage, and have no refresh, no multi-factor sign-in and no self-service password reset (an admin sets passwords).
- **Audit log** is append-only through the application; someone with direct database access can still alter it.
- **Scheduler** runs inside the API process: run one instance, or move it to a worker. **Attachments** are on local disk: use shared storage for more than one instance.
- **Emission factors shipped in the starter catalog are indicative defaults.** Replace them with official values before publishing.
- **Formulas** take one data input per metric; derived indicators (for example renewable share from two metrics) must be entered directly.
- **Reviewers**: any ESG-team user may review at either level; the reviewer emails only control notifications.
- **Reporting standards**: GRI references are stored per metric, but there are no report templates in GRI, POJK 51/2017 or IFRS S1/S2 format yet.
- **Integration** with an external portfolio system is not built; companies and projects are entered manually.
- **Locale**: the interface is English only; numbers must use a dot for decimals.
- **Scale**: lists are paged on the server, but column sort/filter act on the loaded page; the executive dashboard reads one company at a time.

## 13. Operating it

See the README for setup and the environment table. Before go-live: change the seeded admin password, set a strong `JWT_SECRET` and `CORS_ORIGIN`, use `npm run prisma:deploy -w @esg/api` for migrations, put the API and web behind HTTPS and a reverse proxy (`TRUST_PROXY=1`), back up PostgreSQL and the upload folder together, and walk through [docs/UAT.md](UAT.md).
