-- Allow management users to read profiles of users whose collection requests
-- they can see (assigned to their facility or unassigned).
-- This is needed for the Collection Management page to display household names.

CREATE OR REPLACE FUNCTION public.user_is_active_management()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM management_users mu
    WHERE mu.user_id = auth.uid()
      AND mu.is_active = true
  );
END;
$$;

-- Add a SELECT policy on profiles allowing active management users to read
-- profiles of users who have collection_requests at their facility or unassigned.
DROP POLICY IF EXISTS profiles_select_mgmt ON profiles;
CREATE POLICY profiles_select_mgmt ON profiles
  FOR SELECT TO authenticated
  USING (
    user_is_active_management()
    AND EXISTS (
      SELECT 1 FROM collection_requests cr
      WHERE cr.user_id = profiles.id
      AND (
        cr.facility_id IS NULL
        OR EXISTS (
          SELECT 1 FROM management_users mu2
          WHERE mu2.user_id = auth.uid()
          AND mu2.facility_id = cr.facility_id
          AND mu2.is_active = true
        )
      )
    )
  );
