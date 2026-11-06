# ESG Monitoring System

Web app for end-to-end ESG data management: data requests to portfolio companies, two-step review, emission calculation, reports and an audit trail. See [PLAN.md](PLAN.md) for the original plan and [docs/UAT.md](docs/UAT.md) for the acceptance checklist.

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
All planned phases (0–5) are implemented. The integration with the external portfolio-monitoring system (company/project master data) is not built; master data is entered or imported manually.
