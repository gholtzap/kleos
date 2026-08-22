CREATE TABLE IF NOT EXISTS folio_conversations (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'direct' CHECK (kind IN ('direct')),
  opened_by TEXT NOT NULL REFERENCES folio_accounts(id) ON DELETE RESTRICT,
  -- The structured declaration the conversation was opened with, kept verbatim.
  -- It is a commitment the sender made, so it is never rewritten.
  outreach JSONB,
  last_sequence BIGINT NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT NOT NULL DEFAULT ''
    CHECK (CHAR_LENGTH(last_message_preview) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:split
-- One direct thread per pair of members. Ordering the two ids and making them
-- the primary key lets Postgres enforce that, rather than trusting every call
-- site to build the same key the same way.
CREATE TABLE IF NOT EXISTS folio_direct_pairs (
  low_account_id TEXT NOT NULL REFERENCES folio_accounts(id) ON DELETE RESTRICT,
  high_account_id TEXT NOT NULL REFERENCES folio_accounts(id) ON DELETE RESTRICT,
  conversation_id UUID NOT NULL UNIQUE
    REFERENCES folio_conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (low_account_id, high_account_id),
  CHECK (low_account_id < high_account_id)
);

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_conversation_members (
  conversation_id UUID NOT NULL
    REFERENCES folio_conversations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES folio_accounts(id) ON DELETE RESTRICT,
  lane TEXT NOT NULL
    CHECK (lane IN ('primary', 'requests', 'opportunities', 'archived')),
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'accepted', 'declined', 'blocked')),
  -- How far this member has read. Doubles as the read receipt the other side
  -- sees, so there is no separate receipts table.
  last_read_sequence BIGINT NOT NULL DEFAULT 0 CHECK (last_read_sequence >= 0),
  unread_count BIGINT NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  -- Copied from the conversation on every send so the inbox list is one
  -- index-only keyset scan with no join to order by.
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, account_id)
);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_conversation_members_inbox_idx
ON folio_conversation_members
  (account_id, lane, last_message_at DESC, conversation_id DESC)
WHERE state <> 'blocked';

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_conversation_members_unread_idx
ON folio_conversation_members (account_id, lane)
INCLUDE (unread_count)
WHERE unread_count > 0;

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL
    REFERENCES folio_conversations(id) ON DELETE CASCADE,
  -- Gapless and monotonic within the conversation. Unread, read receipts, and
  -- the poll delta are all arithmetic on this column.
  sequence BIGINT NOT NULL CHECK (sequence > 0),
  kind TEXT NOT NULL CHECK (kind IN ('text', 'outreach', 'notice')),
  -- NULL only on a notice, which the system writes rather than a member.
  author_id TEXT REFERENCES folio_accounts(id) ON DELETE RESTRICT,
  body TEXT NOT NULL DEFAULT '' CHECK (CHAR_LENGTH(body) <= 5000),
  outreach JSONB,
  notice TEXT CHECK (
    notice IS NULL
    OR notice IN ('accepted', 'declined', 'blocked', 'archived')
  ),
  actor_id TEXT REFERENCES folio_accounts(id) ON DELETE RESTRICT,
  link_preview JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  UNIQUE (conversation_id, sequence),
  CHECK ((kind = 'outreach') = (outreach IS NOT NULL)),
  CHECK ((kind = 'notice') = (author_id IS NULL)),
  CHECK ((kind = 'notice') = (notice IS NOT NULL))
);

-- migrate:split
-- Added while the table is empty. Attaching a stored generated column to a
-- large folio_messages later would rewrite the whole table.
ALTER TABLE folio_messages
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english'::REGCONFIG, body)) STORED;

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_messages_history_idx
ON folio_messages (conversation_id, sequence DESC);

-- migrate:split
CREATE INDEX IF NOT EXISTS folio_messages_search_idx
ON folio_messages USING GIN (search_vector);

-- migrate:split
-- Bounds how much cold outreach one account can send in a day. Volume is half
-- of what makes an inbox unusable; the terms alone do not cap it.
CREATE INDEX IF NOT EXISTS folio_messages_outreach_author_idx
ON folio_messages (author_id, created_at DESC)
WHERE kind = 'outreach';

-- migrate:split
CREATE TABLE IF NOT EXISTS folio_message_blocks (
  account_id TEXT NOT NULL REFERENCES folio_accounts(id) ON DELETE CASCADE,
  blocked_account_id TEXT NOT NULL
    REFERENCES folio_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, blocked_account_id),
  CHECK (account_id <> blocked_account_id)
);
