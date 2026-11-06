# Verdant – ESG Monitoring System

("Verdant" is a working product name; it appears in `apps/web/src/components/Logo.tsx`, `pages/Login.tsx`, `components/Layout.tsx` and `index.html` and is easy to change.)

Web app for end-to-end ESG data management: data requests to portfolio companies, two-step review, emission calculation, reports and an audit trail. See [PLAN.md](PLAN.md) for the original plan, [docs/SYSTEM.md](docs/SYSTEM.md) for a full description of the rules, security controls, known limits and review findings, and [docs/UAT.md](docs/UAT.md) for the acceptance checklist.

## Structure
- `apps/api` – NestJS 11 + Prisma + PostgreSQL (JWT auth, role-based access, audit logging, scheduler, PDF/Excel export)
- `apps/web` – React 19 + Vite + Tailwind + TanStack Query/Table + Recharts

## Getting started
```bash
npm install
npm run db:up                           # Postgres on localhost:5433 (or point DATABASE_URL at your own)
cp apps/api/.env.example apps/api/.env  # then edit secrets
npm run db:migrate                      # creates tables
npm run db:seed                         # admin user from SEED_ADMIN_* in .env
npm run db:seed:catalog                 # optional: starter E/S/G themes, metrics, formulas (safe to re-run)
npm run dev:api                         # http://localhost:3000/api
npm run dev:web                         # http://localhost:5173
```
`npm run lint` (type-check), `npm test`, `npm run build`.

## Roles
| Role | Can |
|------|-----|
| `ADMIN` | everything, including user management |
| `ESG_TEAM` | master data, metric selections, send/review data requests, run calculations, reports, minutes |
| `INVESTEE` | fill in and submit requests for **their own company only** (user must have a company) |
| `VIEWER` | read-only access to requests, reports, audit trail |

Endpoints are authenticated by default; `@Public()` opts out and `@Roles(...)` restricts. ADMIN passes every role check.

## How data flows
1. **Master data** (ESG Configuration): themes, metrics, data-input attributes, emission factors, base-year GHG, formulas.
2. **Metrics Management**: choose which metrics each company reports (versioned; one active version per company).
3. **Data requests**: periodic (generated daily from *Scheduling Data Capture*) or ad hoc. Each request snapshots the company's active metrics.
4. **Fill in → submit → review level 1 → review level 2 → approved.** A different person must do the second review. "Need revision" sends it back.
5. **Calculation** of an approved request (formula + emission factor of the period's end year). Every run is kept; the latest is used in reports.
6. **ESG Output Report** (tables, charts, PDF, consolidated view) and **Dashboard**.
7. Every change is recorded in the **Audit Trail** (filter by object/date, export to Excel).

### Starter catalog
`npm run db:seed:catalog` loads 14 themes and 45 metrics across the three pillars (energy, GHG, water, waste · health & safety, welfare, worker rights, diversity, community · anti-corruption, compliance, audit & risk, policies, financial transparency), each tagged with its GRI disclosure (climate metrics also with IFRS S2). It never overwrites rows you have edited.
Five metrics are *calculated* (electricity, diesel, gasoline, LPG, air travel → tCO2-e) with their emission factors and formulas.
**The emission factors are indicative defaults. Replace them with the official factors for your reporting year before publishing anything.** Add POJK 51/2017 or other references per metric under ESG Catalog → ESG Metric → Standards.

A metric has two units: the one the company *enters* (e.g. kWh) and, for calculated metrics, the *result* unit (tCO2-e). Only results in tCO2-e with a Scope 1–3 count toward GHG totals.

### Targets, the ESG index and risk indicators
- **Targets** (ESG Catalog → Targets) are per company, metric and year, either "at most" (emissions, injuries) or "at least" (renewables, training).
- A metric's **yearly figure** combines its approved periods by its aggregation rule: add up, average, or latest. A calculated metric is measured by its calculation result.
- **Attainment** of a target is capped at 100%. Status: met ≥ 100, at risk ≥ 80, off track below. A pillar's index is the mean attainment of its targets that have data; the **ESG index** is the mean of the pillar indices. It is a progress measure, not an external rating.
- **Risk & Compliance** registers (incidents, audit findings, risks, compliance checklist) feed the dashboard's indicators: serious open incidents, overdue findings, high risks (likelihood × impact ≥ 15) and compliance rate.
- Branches and plants are modelled as subsidiary companies; the dashboard shows one company at a time and the consolidated report sums a company with its direct subsidiaries.

A formula's data-input variable receives the single value a request holds for that metric; other variables must be emission factors or base-year codes (see the simulator in ESG Configuration → Formula).

## Configuration (`apps/api/.env`)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL`, `JWT_SECRET` | required |
| `JWT_EXPIRES_IN`, `PORT` | token lifetime (default `8h`), port (default 3000) |
| `CORS_ORIGIN` | comma-separated allowed web origins (required in production) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | real email; without `SMTP_HOST` emails are only logged |
| `UPLOAD_DIR` | where attachments are stored (default `uploads`) |
| `LOGIN_RATE_LIMIT` | login attempts per minute per address (default 10) |
| `TRUST_PROXY` | set to `1` behind one reverse proxy so rate limiting sees client addresses |
| `1st_reviewer` / `2nd_reviewer` (in *Configuration*, not the env file) | comma-separated emails notified when a review is due |

In production (`NODE_ENV=production`) the API refuses to start with a missing/example/short (<32 chars) `JWT_SECRET` or without `CORS_ORIGIN`.

## Before going live
- Change the seeded admin password and set a strong `JWT_SECRET`.
- Move attachments from local disk to shared object storage if running more than one API instance (`apps/api/src/common/storage.ts` is the only place to change).
- The daily job (06:00 server time) runs inside the API process; run a single API instance or move it to a dedicated worker.
- Serve the web app and API over HTTPS behind a reverse proxy; run `npm run prisma:deploy -w @esg/api` (not `migrate dev`) for migrations.

## Status
All planned phases (0–5) and the follow-up round (starter catalog, targets and ESG index, risk & compliance registers, redesigned interface) are implemented. The integration with the external portfolio-monitoring system (company/project master data) is not built; master data is entered or imported manually.
