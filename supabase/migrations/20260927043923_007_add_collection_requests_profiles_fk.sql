-- Add foreign key from collection_requests.user_id to profiles.id
-- so PostgREST can join collection_requests -> profiles.
-- The existing FK references auth.users, but the frontend needs to join
-- to profiles for full_name/email/phone display.

ALTER TABLE collection_requests
  ADD CONSTRAINT collection_requests_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
