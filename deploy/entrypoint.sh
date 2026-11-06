#!/bin/sh
# Start-up sequence: apply database migrations, create the first admin (and optionally the starter catalog), run the API.
set -e

echo "Applying database migrations…"
npx prisma migrate deploy

# Both seeds are safe to repeat: they only create what is missing and never overwrite existing rows or passwords.
if [ "$SEED_ON_START" = "true" ]; then
  echo "Ensuring the admin account exists…"
  npx ts-node --transpile-only prisma/seed.ts
fi
if [ "$SEED_CATALOG" = "true" ]; then
  echo "Ensuring the starter ESG catalog exists…"
  npx ts-node --transpile-only prisma/seed-catalog.ts
fi

exec node dist/main.js
