import { supabase } from '@/lib/supabase';
import type { Alert, AlertType, AlertSeverity } from '@/types';

export async function getAlerts(facilityId: string) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Alert[];
}

export async function markAlertRead(id: string, readBy: string) {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true, read_at: new Date().toISOString(), read_by: readBy })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllAlertsRead(facilityId: string, readBy: string) {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true, read_at: new Date().toISOString(), read_by: readBy })
    .eq('facility_id', facilityId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function createAlert(data: {
  facility_id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_id?: string;
  related_table?: string;
}) {
  const { data: result, error } = await supabase
    .from('alerts')
    .insert(data)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('system_history').insert({
    facility_id: data.facility_id,
    category: 'Alert',
    action: `Alert: ${data.title}`,
    entity_type: 'alerts',
    entity_id: result.id,
    description: data.message,
  performed_by_name: 'System',
  });

  return result as Alert;
}
