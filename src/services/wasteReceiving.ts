import { supabase } from '@/lib/supabase';
import type { WasteReceiving, WasteType } from '@/types';

export async function getReceivingRecords(facilityId: string) {
  const { data, error } = await supabase
    .from('waste_receiving')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as WasteReceiving[];
}

export async function createReceivingRecord(data: {
  facility_id: string;
  source: string;
  waste_type: WasteType;
  quantity_kg: number;
  notes?: string;
  received_by: string;
}) {
  const { data: result, error } = await supabase
    .from('waste_receiving')
    .insert(data)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('system_history').insert({
    facility_id: data.facility_id,
    category: 'Waste Receiving',
    action: 'Waste received',
    entity_type: 'waste_receiving',
    entity_id: result.id,
    description: `Received ${data.quantity_kg}kg ${data.waste_type} from ${data.source}`,
    performed_by: data.received_by,
  });

  return result as WasteReceiving;
}
