# Kleos

## Local setup

1. Copy `.env.example` to a local environment file.
2. Set the Clerk, database, rate-limit, and scheduled-task values.
3. Run `npm ci`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

Production must set `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`,
`RATE_LIMIT_SECRET`, and `CRON_SECRET`. Run the database migration before you
deploy code that uses the new schema.

## Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:db` with a disposable PostgreSQL database

For a controlled capacity check, set `KLEOS_BASE_URL` and
`KLEOS_TEST_PROFILE_ID`. Then run `npm run test:load`. You can set
`KLEOS_LOAD_REQUESTS` and `KLEOS_LOAD_CONCURRENCY` for the approved target.
