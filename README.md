# Kleos

## Local setup

1. Copy `.env.example` to a local environment file.
2. Set the Clerk, database, rate-limit, and scheduled-task values.
3. Run `npm ci`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

Production must set `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`,
`CLERK_SECRET_KEY` (GitHub account verification), `RATE_LIMIT_SECRET`, and
`CRON_SECRET`. Run the database migration before you deploy code that uses the
new schema.

## GitHub OAuth

The production Clerk GitHub connection uses the dedicated `Kleos` OAuth app
owned by `gholtzap`. Keep these GitHub settings unchanged:

- Homepage URL: `https://www.kleos.bio`
- Callback URL: `https://clerk.kleos.bio/v1/oauth_callback`

Store the client secret only in the Clerk production instance. To rotate it,
create a second GitHub client secret, update Clerk, complete one connection,
and then delete the old secret. The API reads each user's GitHub token from
Clerk. It does not send that token to the browser or store it in the profile.

## Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:db` with a disposable PostgreSQL database

For a controlled capacity check, set `KLEOS_BASE_URL` and
`KLEOS_TEST_PROFILE_ID`. Then run `npm run test:load`. You can set
`KLEOS_LOAD_REQUESTS` and `KLEOS_LOAD_CONCURRENCY` for the approved target.
