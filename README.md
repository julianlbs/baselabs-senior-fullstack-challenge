# Equipment Reservation Challenge - Starter

Starter application for the **Senior Full Stack Developer Take Home Assessment**. The assessment is designed for **4–6 focused hours** and uses only local, free, open-source tooling.

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm 11 (the exact package-manager version is pinned in `package.json`)

## Quick Start

```bash
pnpm install
pnpm db:setup
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No separate environment setup is required. The application defaults to a local SQLite database at `dev.db`; `DATABASE_URL` may optionally override it.

## Database Setup

`pnpm db:setup` generates the Prisma client, applies the schema to SQLite, and loads deterministic starter data. To restore that known state later, run:

```bash
pnpm db:reset
```

Use `pnpm db:seed` to reload the deterministic seed without recreating the schema. Both reset and seed replace local reservation data.

## Project Overview

- A **Location** owns equipment and reservations.
- **Equipment** has a total quantity at one location.
- A **Reservation** covers a time interval at one location and is either `DRAFT` or `CONFIRMED`.
- A **ReservationItem** explicitly links a reservation to equipment with a requested quantity.
- Only `CONFIRMED` reservations consume availability.

The seeded reservation list is complete starter functionality. The note editor is a small, working mutation example; it is not one of the assessment tickets.

## Architecture

- `src/app` — App Router pages, loading/error boundaries, and API routes
- `src/features/reservations` — reservation-list UI and note form
- `src/schemas` — shared Zod request/form validation
- `src/server/reservations` — typed reads and reservation domain operations
- `src/lib` — Prisma client and small shared server utilities
- `src/types` — shared UI-facing domain types
- `prisma/schema.prisma` — relational data model
- `prisma/seed.ts` — deterministic local data

## Candidate Tasks

1. **Fix Reservation Availability.** Correct the existing availability behavior so it follows all documented business rules.
2. **Implement Create Reservation.** Build the client validation, server mutation, persistence, availability enforcement for confirmed reservations, and appropriate success/error experience.

**Optional bonus:** Edit Reservation. This is not required.

No automated tests are required. Focus on clear production-style code, sound business rules, and useful manual verification.

## Business Rules

- Reservation intervals use `[start, end)` semantics: the start is inclusive and the end is exclusive.
- Adjacent reservations do not overlap. For example, `09:00–12:00` and `12:00–15:00` can both be reserved.
- Only `CONFIRMED` reservations consume inventory; `DRAFT` reservations do not.
- Quantity must be positive.
- Requested quantity may not exceed the available quantity.
- Availability is location-specific.
- The server is authoritative and must re-check availability before confirming a reservation.
- An unavailable confirmed request returns an actionable domain error that uses the stored equipment name. With the seed data that is `Only 2 Generators are available for the selected period.`

## Useful Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run strict TypeScript checks |
| `pnpm db:setup` | Generate Prisma, apply the schema, and seed SQLite |
| `pnpm db:seed` | Reload deterministic seed data |
| `pnpm db:reset` | Restore deterministic starter data |

## No External Services

No external services, API keys, authentication providers, cloud accounts, paid components, Docker, or private package registries are required.

## Scope

Do not build authentication or user management, payments, invoicing, taxes, accounting, email/SMS, external API integrations, cloud infrastructure, Redis, Datadog, CI/CD, Trigger.dev workflows, microservices, or event sourcing. Edit Reservation is bonus-only, and automated tests are not required.

## Assumptions

- Times are UTC instants. The list formats with `timeZone: "UTC"`. The create form labels start and end as UTC, and the server appends `Z` when a value has no offset, so `09:00` on the form is `09:00` UTC on the list.
- A reservation is one location and one interval. Each equipment type appears once, and that equipment must belong to the location.
- A draft may request more than is currently free. Only `CONFIRMED` reservations consume inventory.
- There is no signed-in user. Anyone who can open the app can create a reservation.
- Notes stay on the existing note editor. Create does not collect a note.
- The database is local SQLite (`dev.db`). `DATABASE_URL` may override the path.

## Technical decisions

- Availability lives in `getAvailableQuantity`. Overlap is half-open `[start, end)`: `startAt < requestedEnd` and `endAt > requestedStart`, confirmed rows only, scoped by location and equipment. Adjacent intervals such as `09:00–12:00` and `12:00–15:00` do not conflict.
- Create runs in one `prisma.$transaction`. A confirmed save calls `getAvailableQuantity` with the transaction client before `reservation.create` writes the `ReservationItem` rows. A `DomainError` aborts the transaction, so the reservation is not stored.
- Drafts skip that availability rejection. The server still checks that the location exists and that each equipment row belongs to it.
- `POST /api/reservations` validates the body with the shared Zod schema and maps `DomainError` to `{ error, code }`.
- The create page is a server component that loads locations and equipment. The form is a client component using React Hook Form and that same schema.
- The schema was already relational (`Reservation` and `ReservationItem`). Create did not add a migration.
- After a successful create, the form calls `router.refresh()` and returns to the list. The list page is `force-dynamic`, so the next load reads the new row. Availability itself is not cached.

## Trade-offs / incomplete work

- Edit Reservation is implemented. `PUT /api/reservations/[id]` replaces the location, interval, status, and equipment lines in one transaction. When the saved status is confirmed, availability is re-checked inside that transaction, and the reservation being edited is excluded from its own availability sum so it does not conflict with itself. Draft updates still do not consume stock. The note editor is unchanged.
- The quantity field is capped between 1 and that equipment’s `totalQuantity`. The server still rejects a confirmed request above the remaining quantity for the selected period, which can be lower than the total. The form does not preview that remaining quantity; the server message after submit is the source of truth.
- Conflict reporting stops at the first equipment line that does not fit.
- The message pluralizes the stored name when more than one unit is available. Seed equipment is singular (`Generator`), so the copy is `Only 2 Generators are available for the selected period.`
- Re-checking inside a SQLite transaction does not take a row lock. See Production considerations.
- There is no automated test suite. Check the happy path and a confirmed overlap by hand.

## Production considerations

- Two confirms can both read remaining stock and then both insert. Prisma’s SQLite transaction is deferred: the availability read does not reserve the database, and the later write does not re-run that read. A failed check rolls back its own transaction, but it does not stop a second transaction that already observed the same remaining quantity. This app does not use row locks.
- SQLite serializes writers on one database file. That is enough for this local app. Under higher traffic or more than one app instance, move to Postgres, lock the equipment row (or use serializable isolation) for the check-and-insert, and keep the same half-open rule.
- `Reservation` is indexed on `(locationId, status, startAt, endAt)`, and `ReservationItem` is indexed on `equipmentId`. Overlap is still two range predicates. A much larger table would need the query plan checked and, if needed, a narrower lookup by location and equipment before the time comparison.
- Do not cache `getAvailableQuantity` without invalidating it on every confirmed write. This app does not cache that read.

## Submission

Follow the submission instructions in the assessment document you received.
