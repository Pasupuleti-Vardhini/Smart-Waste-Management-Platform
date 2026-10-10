import { supabase } from '@/lib/supabase';
import type { CollectionRequest, CollectionRecord, WasteType } from '@/types';

export async function createCollectionRequest(data: {
  waste_type: WasteType;
  estimated_quantity_kg: number;
  preferred_pickup_date: string;
  preferred_pickup_time: string;
  pickup_address: string;
  notes?: string;
}) {
  const { data: result, error } = await supabase
    .from('collection_requests')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as CollectionRequest;
}

export async function getMyRequests() {
  const { data, error } = await supabase
    .from('collection_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as CollectionRequest[];
}

export async function getRequestById(id: string) {
  const { data, error } = await supabase
    .from('collection_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as CollectionRequest | null;
}

export async function cancelRequest(id: string) {
  const { error } = await supabase
    .from('collection_requests')
    .update({ status: 'Cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getMyCollectionRecords() {
  const { data, error } = await supabase
    .from('collection_records')
    .select('*')
    .order('collected_at', { ascending: false });
  if (error) throw error;
  return data as CollectionRecord[];
}

export async function getFacilityRequests(facilityId: string) {
  // Fetch requests assigned to this facility OR unassigned requests (facility_id is null)
  const { data, error } = await supabase
    .from('collection_requests')
    .select('*, profiles!collection_requests_profiles_user_id_fkey(full_name, email, phone)')
    .or(`facility_id.eq.${facilityId},facility_id.is.null`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function assignCollector(requestId: string, collectorId: string, collectorName: string) {
  const { error } = await supabase
    .from('collection_requests')
    .update({
      assigned_collector_id: collectorId,
      assigned_collector: collectorName,
      status: 'Assigned',
    })
    .eq('id', requestId);
  if (error) throw error;
}

export async function updateRequestStatus(requestId: string, status: string) {
  const updates: Record<string, unknown> = { status };
  if (status === 'Completed') updates.completed_at = new Date().toISOString();
  const { error } = await supabase
    .from('collection_requests')
    .update(updates)
    .eq('id', requestId);
  if (error) throw error;
}

export async function recordCollection(
  requestId: string,
  facilityId: string,
  userId: string,
  wasteType: string,
  estimatedQty: number,
  actualQty: number,
  rewardRate: number,
  rewardAmount: number,
  collectorId: string,
  collectorName: string,
  recordedBy: string,
  rewardRateId: string,
) {
  // Check for existing collection record to prevent duplicates
  const { data: existing, error: checkError } = await supabase
    .from('collection_records')
    .select('id')
    .eq('collection_request_id', requestId)
    .maybeSingle();
  if (checkError) throw checkError;
  if (existing) {
    throw new Error('Collection has already been recorded for this request');
  }

  // Create collection record (status Completed = collection + reward fully processed)
  const { error: recError } = await supabase.from('collection_records').insert({
    collection_request_id: requestId,
    facility_id: facilityId,
    user_id: userId,
    waste_type: wasteType,
    estimated_quantity_kg: estimatedQty,
    actual_quantity_kg: actualQty,
    reward_rate: rewardRate,
    reward_amount: rewardAmount,
    collector_id: collectorId,
    collector_name: collectorName,
    recorded_by: recordedBy,
    status: 'Completed',
  });
  if (recError) throw recError;

  // Update request status to Completed with actual quantity and reward
  const { error: reqError } = await supabase
    .from('collection_requests')
    .update({
      status: 'Completed',
      actual_quantity_kg: actualQty,
      reward_amount: rewardAmount,
      reward_rate_id: rewardRateId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (reqError) throw reqError;

  // Create waste receiving record
  const { error: recvError } = await supabase.from('waste_receiving').insert({
    facility_id: facilityId,
    source: 'Household Collection',
    collection_request_id: requestId,
    waste_type: wasteType,
    quantity_kg: actualQty,
    unit: 'kg',
    received_by: recordedBy,
    status: 'Received',
  });
  if (recvError) throw recvError;

  // Log to history
  await supabase.from('system_history').insert({
    facility_id: facilityId,
    category: 'Collection',
    action: 'Collection completed',
    entity_type: 'collection_requests',
    entity_id: requestId,
    description: `Collection completed: ${actualQty}kg ${wasteType}, reward: ${rewardAmount}`,
    performed_by: recordedBy,
  });
}

export async function assignFacilityToRequest(requestId: string, facilityId: string) {
  const { error } = await supabase
    .from('collection_requests')
    .update({ facility_id: facilityId, status: 'Assigned' })
    .eq('id', requestId);
  if (error) throw error;
}
