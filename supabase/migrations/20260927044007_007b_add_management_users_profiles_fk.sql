-- Add foreign key from management_users.user_id to profiles.id
-- so PostgREST can join management_users -> profiles.

ALTER TABLE management_users
  ADD CONSTRAINT management_users_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
