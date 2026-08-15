CREATE UNIQUE INDEX IF NOT EXISTS folio_records_public_handle_idx
ON folio_records ((lower(public_record #>> '{person,handle}')))
WHERE public_record #>> '{person,handle}' IS NOT NULL;
