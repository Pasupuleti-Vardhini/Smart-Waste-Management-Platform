/*
# Add unique constraint on collection_records.collection_request_id

## Purpose
Prevents duplicate collection records when "Complete Collection" is clicked
multiple times for the same request. Each collection request can only have
one collection record.

## Changes
- Add UNIQUE constraint on collection_request_id column in collection_records table.
  This is safe because the column is already NOT NULL and has a FK to collection_requests.

## Security
- No RLS or policy changes.
*/

-- Add unique constraint to prevent duplicate collection records per request
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'collection_records_collection_request_id_unique'
  ) THEN
    ALTER TABLE collection_records
    ADD CONSTRAINT collection_records_collection_request_id_unique UNIQUE (collection_request_id);
  END IF;
END $$;
