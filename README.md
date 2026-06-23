# Wodify API Clone

A self-contained clone of a subset of the [Wodify API](https://docs.wodify.com/), built with Next.js (App Router), Prisma 7, and Postgres — deployable on Vercel with a serverless Postgres database (Vercel Postgres / Neon). Includes a simple admin UI for browsing and managing every resource.

See `../WODIFY_API_REFERENCE.md` for the original API summary this clone is based on.

## Scope

Implements core CRUD/list/search for:

- **Leads** — `/api/v1/leads`, `/api/v1/lead-statuses`
- **Clients** — `/api/v1/clients` (+ deactivate/reactivate/suspend/reinstate), `/api/v1/client-statuses`
- **Memberships** — `/api/v1/membership-templates`, `/api/v1/memberships` (+ deactivate)
- **Financials** — `/api/v1/invoices`, `/api/v1/transactions/:id`, `/api/v1/discounts` (read-only, seeded data)
- **Programs & Classes** — `/api/v1/classes`, reservations (`/api/v1/classes/:id/reservations`, `/api/v1/reservations`, cancel), sign-ins (`/api/v1/classes/:id/sign-ins`, `/api/v1/sign-ins`)
- **Workouts** — `/api/v1/workouts`

All list/search endpoints accept Wodify's `q=field|operator|value` syntax (operators: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `like`, `in`, `not_in`, `between`, `is_null`, `not_null`; conditions joined with `;` are AND'd) plus `page`/`pageSize` pagination. Auth and rate limiting are intentionally omitted (by request).

The long tail of the real API (tags, groups, holds, tasks/communications, document templates, generic cross-type "bookings") is out of scope.

## Local setup

```bash
npm install
cp .env.example .env   # then set DATABASE_URL to a Postgres connection string
```

If you don't have a Postgres instance handy, Prisma can run one locally for you:

```bash
npx prisma dev -n wodify --detach   # prints a DATABASE_URL — put it in .env
```

Apply the schema and generate the client:

```bash
npx prisma generate
# Against a fresh database, apply prisma/migrations/0_init/migration.sql with any
# Postgres client (e.g. `psql -f prisma/migrations/0_init/migration.sql`), or run
# `npx prisma migrate dev` against a standard hosted Postgres instance.
```

Seed sample data, then run the app:

```bash
npm run db:seed
npm run dev
```

Run tests (uses the same `DATABASE_URL`; each test file truncates all tables before running):

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Deploying to Vercel

1. Create a Postgres database (Vercel Postgres / Neon via the Vercel Marketplace) and link it to the project.
2. Set `DATABASE_URL` in the project's Vercel environment variables.
3. Apply `prisma/migrations/0_init/migration.sql` to that database, then run `npm run db:seed` once if you want sample data.
4. Deploy. `next build` compiles the app; Prisma Client is generated from `prisma/schema.prisma` (run `npx prisma generate` as part of your build if it isn't already cached in `node_modules`).
