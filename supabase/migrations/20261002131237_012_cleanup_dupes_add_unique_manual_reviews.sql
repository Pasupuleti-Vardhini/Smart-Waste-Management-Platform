/*
# Clean up duplicate manual reviews and add unique constraint

## Purpose
1. Remove duplicate manual_reviews records, keeping only the most recent
   review per ai_detection_id.
2. Add a UNIQUE constraint on ai_detection_id to prevent future duplicates.

## Changes
- DELETE duplicate manual_reviews rows (keep the one with the latest reviewed_at)
- Add UNIQUE constraint on ai_detection_id

## Security
- No RLS or policy changes.
*/

-- Remove duplicates: keep only the latest review per ai_detection_id
DELETE FROM manual_reviews
WHERE id NOT IN (
  SELECT DISTINCT ON (ai_detection_id) id
  FROM manual_reviews
  ORDER BY ai_detection_id, reviewed_at DESC
);

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'manual_reviews_ai_detection_id_unique'
  ) THEN
    ALTER TABLE manual_reviews
    ADD CONSTRAINT manual_reviews_ai_detection_id_unique UNIQUE (ai_detection_id);
  END IF;
END $$;
