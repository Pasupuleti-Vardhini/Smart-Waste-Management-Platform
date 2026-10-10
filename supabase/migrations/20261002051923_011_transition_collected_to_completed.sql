/*
# Transition stuck Collected requests to Completed

## Purpose
Several collection requests were recorded with status "Collected" but never
transitioned to "Completed" due to the previous bug. Now that the workflow
is fixed to go directly to Completed, these stuck records need to be moved
to their correct final status.

## Changes
- UPDATE collection_requests SET status = 'Completed' WHERE status = 'Collected'
- Also update the corresponding collection_records to status = 'Completed'

## Security
- No schema or RLS changes.
*/

UPDATE collection_requests
SET status = 'Completed'
WHERE status = 'Collected';

UPDATE collection_records
SET status = 'Completed'
WHERE status = 'Collected';
