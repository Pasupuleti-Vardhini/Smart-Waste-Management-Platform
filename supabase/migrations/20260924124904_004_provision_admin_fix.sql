/*
# Provision First Company Admin User (fix)

The handle_new_user trigger auto-creates a profile on auth.users insert.
So we only need to update the existing profile and create the management_users record.
*/

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID that was just created
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@greencycle.com';
  
  IF admin_user_id IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      email_change,
      phone_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@greencycle.com',
      crypt('Admin@2026', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"System Administrator","role":"management"}'::jsonb,
      '',
      ''
    )
    RETURNING id INTO admin_user_id;
  END IF;
  
  -- Update the profile (trigger already created one)
  UPDATE profiles 
  SET role = 'admin', full_name = 'System Administrator', is_active = true
  WHERE id = admin_user_id;
  
  -- Create management_users record if not exists
  INSERT INTO management_users (user_id, company_id, facility_id, role, job_title, is_active)
  SELECT admin_user_id, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'admin', 'Company Administrator', true
  WHERE NOT EXISTS (
    SELECT 1 FROM management_users WHERE user_id = admin_user_id
  );
  
  RAISE NOTICE 'Admin user provisioned with ID: %', admin_user_id;
END $$;
