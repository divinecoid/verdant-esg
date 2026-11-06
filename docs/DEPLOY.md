# Deploying to Dokploy

One container runs everything: the NestJS API also serves the built web app on port 3000 (same address, no CORS, no second web server). A PostgreSQL service from Dokploy holds the data. Files uploaded by users live on a volume.

```
Browser ──HTTPS──▶ Traefik (Dokploy) ──▶ app container :3000 ──▶ PostgreSQL (Dokploy service)
                                           └─ /data/uploads (volume)
```

## 1. DNS
Create an `A` record for the app's hostname (for example `verdant.divine.co.id`) pointing at the Dokploy server. The HTTPS certificate can only be issued once the name resolves publicly. Check with `dig +short verdant.divine.co.id`.

## 2. Database
In the Dokploy project: **Create Service → Database → PostgreSQL** (version 16). Note its **Internal Connection URL**; that is the app's `DATABASE_URL`. Do not publish the database port.

## 3. Application
**Create Service → Application**, source = this repository (Git) or an uploaded archive, **Build Type = Dockerfile** (path `./Dockerfile`, context `.`).

- **Environment**: from `deploy/dokploy.env.example`; fill in the secrets.
- **Volume**: mount a volume at `/data` (uploaded files). Without it uploads vanish on every redeploy.
- **Domain**: host = your hostname, container port `3000`, HTTPS on, certificate = Let's Encrypt.
- **Deploy**. On every start the container applies pending database migrations, then (while `SEED_ON_START=true`) makes sure the admin account exists. Seeding never changes an existing account or row, so it is safe to leave on; set both seed flags to `false` after the first successful start if you prefer.

## 4. After the first deploy
1. Open the address and sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, then **change the password** (Settings → Users).
2. Check `https://<host>/api/health` returns `{"status":"ok"}`.
3. Replace the indicative emission factors (ESG Catalog → Emission Factor) before reporting anything.
4. Set the `1st_reviewer` / `2nd_reviewer` emails (Settings → General) and, if you want email, the `SMTP_*` variables.
5. Walk through `docs/UAT.md`.

## Updating
Redeploy from the new revision. Migrations run automatically; the volume and database are untouched.

## Backups
Back up the PostgreSQL service and the `/data` volume together (Dokploy: Database → Backups, and a volume backup). A database backup alone loses attachments.

## Running more than one copy
Not yet supported: the daily job runs inside the app (it would run once per copy) and uploads are on a local volume.
