CREATE TABLE IF NOT EXISTS folio_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (CHAR_LENGTH(name) BETWEEN 1 AND 200),
  handle TEXT NOT NULL CHECK (CHAR_LENGTH(handle) BETWEEN 2 AND 200),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_accounts_handle_idx
ON folio_accounts (LOWER(handle));

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_posts (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES folio_accounts(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (CHAR_LENGTH(body) <= 5000),
  link_preview JSONB,
  reply_count BIGINT NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  repost_count BIGINT NOT NULL DEFAULT 0 CHECK (repost_count >= 0),
  like_count BIGINT NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_posts_feed_idx
ON folio_posts (created_at DESC, id DESC);

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_post_media (
  id TEXT PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES folio_posts(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 3),
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  public_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  poster_url TEXT,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  duration_seconds DOUBLE PRECISION,
  alt TEXT NOT NULL DEFAULT '' CHECK (CHAR_LENGTH(alt) <= 1000),
  animated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, position),
  CHECK (
    (kind = 'image' AND poster_url IS NULL AND duration_seconds IS NULL)
    OR
    (kind = 'video' AND poster_url IS NOT NULL AND duration_seconds >= 0)
  )
);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_post_media_post_idx
ON folio_post_media (post_id, position);
