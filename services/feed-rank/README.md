# Kleos feed ranker

This crate is the initial online recommendation-service scaffold. It mirrors
the useful boundaries in X's open-source candidate pipeline without copying
its production scale or model:

1. candidate sources run concurrently;
2. feature hydrators run in a declared order;
3. hard eligibility filters remove candidates;
4. one replaceable scorer assigns per-candidate scores;
5. a slate reranker applies author diversity;
6. the service returns ranked post IDs to the TypeScript API.

The default candidate source deliberately returns no posts. There is no social
graph, impression ledger, or trustworthy training data in Kleos yet, so this
service must not invent candidates or present placeholder weights as learned
behavior. The current TypeScript chronological feed remains the production
path until a Postgres-backed source and feed-session contract are implemented.

## Run locally

Set a development-only service token with at least 32 bytes, then start the
ranker from the repository root:

```sh
export FEED_RANKER_AUTH_TOKEN=local-development-token-change-me-1234
npm run ranker:dev
```

The bind address defaults to `127.0.0.1:8081` and can be changed with
`FEED_RANKER_BIND_ADDRESS`.

Health checks do not require service authentication:

```sh
curl http://127.0.0.1:8081/healthz
```

Ranking is an internal authenticated endpoint:

```sh
curl -X POST http://127.0.0.1:8081/v1/rank \
  -H 'Authorization: Bearer local-development-token-change-me-1234' \
  -H 'Content-Type: application/json' \
  -d '{"viewerId":"user_123","pageSize":20,"excludedPostIds":[]}'
```

Until inventory is connected, the successful response contains an empty
`items` array and identifies the placeholder scorer as `heuristic-v0`.

## Module boundaries

- `api.rs`: strict internal HTTP request and response contracts
- `domain.rs`: validated IDs, query, candidate, feature, and result types
- `sources.rs`: candidate inventory boundaries
- `hydration.rs`: viewer/candidate feature loading boundaries
- `filters.rs`: hard eligibility policy
- `scoring.rs`: replaceable deterministic or learned scorer
- `reranking.rs`: slate-level diversity policy
- `pipeline.rs`: orchestration, deduplication, failure policy, and ordering

## Next implementation steps

1. Define follows, reactions, safety edges, feed requests, and impression
   events in PostgreSQL.
2. Implement distinct following and discovery candidate sources.
3. Hydrate public expertise overlap and server-computed content-quality data.
4. Add a signed feed-session cursor and previously-served filtering.
5. Call the service from the TypeScript API in shadow mode with a short timeout.
6. Replace `heuristic-v0` only after offline evaluation and versioned model
   artifacts exist.
