import { supabase } from '@/lib/supabase';
import type { ManagementUserWithProfile, ManagementRole } from '@/types';
import { SUPABASE_URL } from '@/lib/supabase';

export async function getManagementUsers(companyId: string) {
  const { data, error } = await supabase
    .from('management_users')
    .select('*, profiles!management_users_profiles_user_id_fkey(full_name, email, phone), facilities!management_users_facility_id_fkey(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ManagementUserWithProfile[];
}

export async function toggleManagementUserActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('management_users')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteManagementUser(id: string) {
  const { error } = await supabase
    .from('management_users')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function createManagementUserViaEdge(data: {
  email: string;
  password: string;
  full_name: string;
  role: ManagementRole;
  company_id: string;
  facility_id: string;
  job_title?: string;
}) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-management-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Failed to create management user');
  }
  return result;
}

export async function getFacilities(companyId: string) {
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getSystemSettings(facilityId: string) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('facility_id', facilityId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSystemSettings(facilityId: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('system_settings')
    .update(updates)
    .eq('facility_id', facilityId);
  if (error) throw error;
}

export async function getRewardRates(facilityId: string) {
  const { data, error } = await supabase
    .from('reward_rates')
    .select('*')
    .eq('facility_id', facilityId);
  if (error) throw error;
  return data;
}

export async function updateRewardRate(id: string, ratePerKg: number) {
  const { error } = await supabase
    .from('reward_rates')
    .update({ rate_per_kg: ratePerKg })
    .eq('id', id);
  if (error) throw error;
}

export async function getHistory(facilityId: string, category?: string) {
  let query = supabase
    .from('system_history')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data;
}
