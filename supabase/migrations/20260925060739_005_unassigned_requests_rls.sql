/*
# Allow Management to View Unassigned Collection Requests

1. Security Changes
- Add a new SELECT policy on collection_requests so management users can see requests with facility_id = NULL (unassigned household requests that haven't been claimed by any facility yet).
- This is needed so management can see incoming household requests and assign them to their facility.
- The existing policy for facility-scoped requests remains unchanged.

2. Important Notes
- Unassigned requests (facility_id IS NULL) are visible to ALL authenticated management users.
- Once a facility claims a request (sets facility_id), only that facility's management can see it.
- Household users still only see their own requests via the existing `coll_req_select_own` policy.
*/

DROP POLICY IF EXISTS "coll_req_select_unassigned" ON collection_requests;
CREATE POLICY "coll_req_select_unassigned" ON collection_requests FOR SELECT
  TO authenticated USING (
    facility_id IS NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.is_active = true
    )
  );

-- Also allow management to update unassigned requests (to set facility_id)
DROP POLICY IF EXISTS "coll_req_update_unassigned_mgmt" ON collection_requests;
CREATE POLICY "coll_req_update_unassigned_mgmt" ON collection_requests FOR UPDATE
  TO authenticated USING (
    facility_id IS NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.is_active = true
    )
  );
