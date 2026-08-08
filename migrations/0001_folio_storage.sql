CREATE TABLE IF NOT EXISTS folio_records (
  owner_id TEXT PRIMARY KEY,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  record JSONB NOT NULL,
  public_record JSONB NOT NULL DEFAULT '{}'::JSONB,
  search_text TEXT NOT NULL DEFAULT '',
  ownership_levels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  expertise TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:split
ALTER TABLE folio_records
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS public_record JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ownership_levels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS expertise TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- migrate:split
UPDATE folio_records
SET revision = COALESCE(
  CASE
    WHEN (record->>'revision') ~ '^[0-9]+$'
      THEN (record->>'revision')::BIGINT
    ELSE 0
  END,
  0
)
WHERE revision = 0;

-- migrate:split
ALTER TABLE folio_records
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english'::REGCONFIG, search_text)
  ) STORED;

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_records_search_vector_idx
ON folio_records USING GIN (search_vector);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_records_ownership_levels_idx
ON folio_records USING GIN (ownership_levels);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_records_expertise_idx
ON folio_records USING GIN (expertise);

-- migrate:split
DROP INDEX IF EXISTS folio_records_pending_review_idx;

-- migrate:split
CREATE INDEX folio_records_pending_review_idx
ON folio_records USING GIN (record jsonb_path_ops);

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_review_links (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  claim_ids JSONB NOT NULL,
  evidence_ids JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_review_links_owner_id_idx
ON folio_review_links (owner_id, created_at DESC);

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_requests (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES folio_records(owner_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (
    kind IN ('Hiring', 'Advice', 'Contract', 'Collaboration', 'Research')
  ),
  title TEXT NOT NULL,
  need TEXT NOT NULL,
  experience TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  commitment TEXT NOT NULL,
  compensation TEXT NOT NULL,
  constraints TEXT NOT NULL,
  preferred_evidence TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_requests_active_feed_idx
ON folio_requests (created_at DESC, id DESC)
WHERE status = 'Active';

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_requests_active_kind_idx
ON folio_requests (kind, created_at DESC, id DESC)
WHERE status = 'Active';

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_rate_limits (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key_hash)
);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_rate_limits_updated_at_idx
ON folio_rate_limits (updated_at);
