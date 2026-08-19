# RideSync

A personal motorcycle trip planning and management system — plan a ride, estimate
its fuel and cost, track what you actually spend, and keep a preparation
checklist for each trip.

**Stack** — Angular 22 · Express 5 · TypeScript · PostgreSQL 16 · Prisma 7

---

## Layout

```
RideSync/
├── packages/shared/   Domain types and every business formula, used by both sides
├── server/            Express API, Prisma schema and migrations
└── client/            Angular application
```

The shared package matters: the fuel, budget, and mileage formulas are written
once and imported by the API (for authoritative responses) and by the Angular
forms (for live previews). There is no second implementation to drift.

---

## Getting started

Requirements: Node 22.12+, Docker, npm.

```bash
npm install
npm run db:up                       # Postgres 16 in Docker, on port 5455
cp .env.example server/.env         # then set JWT_SECRET
npm run shared:build
npm --workspace @ridesync/server run prisma:migrate
npm --workspace @ridesync/server run db:seed   # optional demo rider
```

Run both sides in separate terminals:

```bash
npm run server:dev    # http://localhost:3100
npm run client:dev    # http://localhost:4200
```

The Angular dev server proxies `/api` to the backend, so the browser is
same-origin in development and the session cookie behaves exactly as it will in
production. Sign in with `demo@ridesync.app` / `hunter350` if you seeded.

### Database

`brew services` and `docker compose` are both unusable on the original
development machine — the Homebrew Postgres binary is linked against a missing
ICU version, and the Compose plugin does not resolve. Postgres therefore runs
via plain `docker run`, wrapped in npm scripts:

```bash
npm run db:up       npm run db:down      npm run db:status
npm run db:psql     npm run db:logs
```

Port **5455** was chosen to avoid a Supabase stack already bound to 5432/5433.
Nothing in the application depends on this; swap the scripts for Compose freely.

---

## Testing

```bash
npm test                                   # shared formulas + API integration
npm --workspace @ridesync/shared run test
npm --workspace @ridesync/server run test
```

API tests run against a real `ridesync_test` database rather than mocks, because
ownership rules and database constraints are exactly what needs proving. The
test database is migrated automatically and truncated between tests.

---

## Design decisions

**Money is never a float.** All monetary and volume columns are `NUMERIC`;
arithmetic runs in `Decimal`; values cross the network as strings. Intermediate
results are never rounded — 1000 km ÷ 30 km/l stays 33.333… through the cost
multiplication and settles only at display. Rounding happens at exactly two
boundaries: persistence and display.

**Fuel spend cannot be double-counted.** Logging a fill creates its own `fuel`
expense; manual fuel-category expenses are rejected. A database check constraint
enforces `(category = 'fuel') = (fuel_log_id IS NOT NULL)`, so this is
structurally impossible rather than merely discouraged, and
`SUM(expenses.amount)` is always the true trip total.

**Trip estimates are snapshots.** A trip stores the mileage figure it was
planned with rather than reading it live from the bike, so correcting a bike's
mileage later never rewrites the estimate on a finished trip.

**Ownership is checked against the database, never trusted from the client.**
Only `bikes` and `trips` carry a `user_id`; expenses, fuel logs, and checklist
items derive ownership through their trip. Resources belonging to another rider
return **404**, not 403, so the API never confirms that they exist.

**Dates are calendar days.** Trip, expense, and fill dates are `DATE`, not
timestamps, so a ride starting 1 March does not display as 28 February after a
timezone change. `timestamptz` is used only for audit columns.

---

## Known limitations

- **Mileage assumes full-tank fills.** Tank-to-tank mileage is only valid if
  every fill topped the tank up. Fills carry an `is_full_tank` flag, the first
  fill's litres are excluded from the calculation, and the API returns `null`
  with a stated reason rather than a plausible wrong number when the data cannot
  support a figure.
- **Logout cannot revoke a JWT.** Tokens stay valid until they expire (24h).
  Logout clears the cookie; there is no refresh rotation or denylist in the MVP.
- **No idempotency keys.** Double submits are prevented by disabling the button
  while a request is in flight, which does not defend against a replayed request.
- **`npm audit` reports 3 high findings** in `deepmerge-ts`, reached only through
  the Prisma **CLI** (a devDependency). The advisory concerns merging recursive
  object graphs; the only input is our own Prisma config. The sole available fix
  is downgrading to Prisma 6, which was judged the worse trade.

---

## Roadmap

| Phase | Scope | State |
|---|---|---|
| 0 | Analysis and architecture | Done |
| 1 | Foundation — workspace, database, auth, error handling, app shell | Done |
| 2 | Bike management | Next |
| 3 | Trip management and fuel estimation | |
| 4 | Expenses and fuel logs | |
| 5 | Checklist | |
| 6 | Trip dashboard | |
| 7 | End-to-end hardening | |
