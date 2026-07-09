# Deployment guide

This bundle is the full source of the TradeX trading platform (a monorepo).
`node_modules`, build output, and server secrets are **not** included — you
install dependencies and set environment variables on the target server.

## What's in the bundle
- `client/` — React + Vite front-end (Zustand, react-router).
- `server/` — Express + TypeScript API + WebSocket price feed + bot/margin engines.
- `api/` — thin Vercel serverless wrapper that re-exports the Express `app`.
- `schema.sql`, `server/schema.sql`, `migrations/*.sql` — the **database schema**.
- `DEPLOYMENT.md` (this file).

## Architecture
- **Front-end**: static build (`client/dist`) served by any static host / CDN.
- **Back-end**: long-running Node process (`server/`). It hosts the REST API **and**
  the WebSocket price simulation, and runs the in-memory engines (bots, SL/TP,
  limit orders, margin, KYC auto-review). It must run as a persistent process
  (not serverless) so those loops keep ticking.
- **Database + Auth**: **Supabase** (hosted Postgres + Supabase Auth). The app does
  **not** ship a local database — see "Database" below.

## Prerequisites
- Node.js 18+ and npm.
- A Supabase project (existing or new).

## Environment variables

### `server/.env` (copy from `server/.env.example`, fill in)
| Key | Notes |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | e.g. `8080` |
| `JWT_SECRET` | must equal the Supabase project's JWT secret (Supabase → Settings → API → JWT Secret) |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `CORS_ORIGIN` | comma-separated allowed front-end origins (your web URL) |
| `TWELVE_DATA_API_KEY` | optional — live market data; falls back to simulation if absent |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only secret) |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `DATABASE_URL` | direct Postgres connection string (Supabase → Settings → Database) |
| `ANTHROPIC_API_KEY` | optional — enables Claude news-impact analysis; rules fallback if absent |
| `KYC_AUTO_REVIEW_MS` | optional — simulated KYC auto-approve delay (default `90000`, `0` disables) |

### `client` build-time env (`client/.env.production`)
| Key | Notes |
|-----|-------|
| `VITE_SUPABASE_URL` | same Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `VITE_API_URL` | your back-end URL + `/api` (e.g. `https://api.example.com/api`) |
| `VITE_WS_URL` | your back-end WS URL (e.g. `wss://api.example.com/ws`) |

> These `VITE_*` values are compiled into the client bundle and are public by design.

## Install, build, run
```bash
npm install                 # installs all workspaces (root/client/server)

# Back-end
npm run build --workspace=server     # tsc -> server/dist
npm start   --workspace=server       # node dist/index.js  (persistent process)

# Front-end
npm run build --workspace=client     # -> client/dist  (serve as static files)
```
Local dev: `npm run dev` (runs client + server together).

## Database (Supabase)
The live data lives in **Supabase cloud**, so there is no DB file to copy. Pick one:

### Option A — reuse the existing Supabase project (simplest)
Point the new server at the same project: set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY`, `DATABASE_URL`, `JWT_SECRET` to the existing project's values.
No data migration needed — the "database" moves via env vars.

### Option B — a fresh / self-hosted Postgres
1. Create the schema, in order:
   ```
   schema.sql                              # base tables
   migrations/add_currency_to_accounts.sql
   migrations/add_account_number_and_type.sql
   migrations/add_notifications.sql
   migrations/add_kyc.sql
   ```
   (Supabase: paste each into the SQL editor. Self-hosted: `psql < file.sql`.)
2. To also copy the **existing data**, dump it from the current DB and restore:
   ```bash
   # from a machine with the Postgres client tools installed:
   pg_dump "$DATABASE_URL" --no-owner --no-privileges -Fc -f data.dump
   pg_restore --no-owner --no-privileges -d "$NEW_DATABASE_URL" data.dump
   # (or:  supabase db dump --db-url "$DATABASE_URL" -f dump.sql )
   ```
   Note: Supabase Auth users live in the `auth` schema; migrate them via the
   Supabase dashboard/CLI, not the app tables.

## Post-deploy checklist
- [ ] `server/.env` filled; server process running and reachable.
- [ ] Migrations applied (verify `notifications` and `kyc_submissions` exist).
- [ ] `client/.env.production` points `VITE_API_URL`/`VITE_WS_URL` at the new back-end.
- [ ] `CORS_ORIGIN` includes the front-end origin.
- [ ] `GET /api/health` returns `{ status: "ok" }`.
