# Kleos

## Local setup

1. Copy `.env.example` to a local environment file.
2. Set the Clerk, database, rate-limit, and scheduled-task values.
3. Run `npm ci`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

The optional Rust feed-ranker scaffold lives in `services/feed-rank`. It is a
separate process in the same repository and is not yet called by the web API.
See `services/feed-rank/README.md` for its contract and local commands.

Production must set `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`,
`CLERK_SECRET_KEY` (connected account verification), `RATE_LIMIT_SECRET`, and
`CRON_SECRET`. Run the database migration before you deploy code that uses the
new schema.

## Connected accounts

Members link third-party accounts at `/settings`. Every connection can sign
them in, so someone who signed up with GitHub can add Google and use either
one afterwards. `src/connections.ts` is the single registry of the providers
Kleos offers; adding one there is what makes it appear in settings and, if it
proves a public username, on profiles.

| Provider | Clerk strategy | Profile field it proves |
| --- | --- | --- |
| GitHub | `oauth_github` | `person.github`, and the projects it can pin |
| Google | `oauth_google` | none — sign-in only |
| X | `oauth_x` | `person.x` |
| Apple | `oauth_apple` | none — sign-in only |

Each provider's mark lives in `public/provider-logos/`, named for the provider.

Each provider must be enabled as a **social connection** in the Clerk instance
before members can use it — separately per instance, so enabling one in
production does not enable it for local development; an unconfigured provider fails at the point where
its OAuth flow would start, and settings reports that.

`github` and `x` are proven, never typed. `PUT /api/profiles` accepts a change
to one of those fields only when a verified Clerk connection reports the same
username, and it stores the username in the casing the provider reports. An
unchanged field is never re-verified, so handles that predate this rule survive
and a provider outage cannot block an unrelated save. Disconnecting clears the
field — and, for GitHub, the pinned projects that depend on it.

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
- `npm run ranker:test`
- `npm run test:db` with a disposable PostgreSQL database

For a controlled capacity check, set `KLEOS_BASE_URL` and
`KLEOS_TEST_PROFILE_ID`. Then run `npm run test:load`. You can set
`KLEOS_LOAD_REQUESTS` and `KLEOS_LOAD_CONCURRENCY` for the approved target.
