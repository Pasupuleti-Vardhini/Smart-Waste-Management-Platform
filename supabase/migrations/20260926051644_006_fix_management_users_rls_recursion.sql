-- Fix infinite recursion in management_users RLS policies.
-- The old policies queried management_users inside management_users policies,
-- causing "infinite recursion detected in policy for relation management_users".
--
-- Solution: use a SECURITY DEFINER function that bypasses RLS to check
-- whether the caller is an active admin for the given company.

CREATE OR REPLACE FUNCTION public.user_is_company_admin(check_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM management_users mu
    WHERE mu.user_id = auth.uid()
      AND mu.company_id = check_company_id
      AND mu.role = 'admin'
      AND mu.is_active = true
  );
END;
$$;

-- Drop the recursive policies and recreate them using the function
DROP POLICY IF EXISTS mgmt_users_select_company ON management_users;
DROP POLICY IF EXISTS mgmt_users_select_own ON management_users;
DROP POLICY IF EXISTS mgmt_users_insert_admin ON management_users;
DROP POLICY IF EXISTS mgmt_users_update_admin ON management_users;
DROP POLICY IF EXISTS mgmt_users_delete_admin ON management_users;

-- SELECT: user can read their own record OR any record in their company (if admin)
CREATE POLICY mgmt_users_select_own ON management_users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY mgmt_users_select_company ON management_users
  FOR SELECT TO authenticated
  USING (user_is_company_admin(company_id));

-- INSERT: only company admins can create management users
CREATE POLICY mgmt_users_insert_admin ON management_users
  FOR INSERT TO authenticated
  WITH CHECK (user_is_company_admin(company_id));

-- UPDATE: only company admins can update management users
CREATE POLICY mgmt_users_update_admin ON management_users
  FOR UPDATE TO authenticated
  USING (user_is_company_admin(company_id))
  WITH CHECK (user_is_company_admin(company_id));

-- DELETE: only company admins can delete management users
CREATE POLICY mgmt_users_delete_admin ON management_users
  FOR DELETE TO authenticated
  USING (user_is_company_admin(company_id));
