import { supabase } from '@/lib/supabase';
import type { DispatchRecord, WasteCategory } from '@/types';

export async function getDispatchRecords(facilityId: string) {
  const { data, error } = await supabase
    .from('dispatch_records')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as DispatchRecord[];
}

export async function getDispatchByCategory(facilityId: string, category: WasteCategory) {
  const { data, error } = await supabase
    .from('dispatch_records')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('category', category)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as DispatchRecord[];
}

export async function createDispatch(data: {
  facility_id: string;
  category: WasteCategory;
  quantity_kg: number;
  destination: string;
  scheduled_date?: string;
  notes?: string;
  dispatched_by: string;
  material_requirement_id?: string;
}): Promise<{ success: boolean; error?: string; data?: DispatchRecord }> {
  // Check available storage
  const { data: inv, error: invError } = await supabase
    .from('storage_inventory')
    .select('stored_quantity, dispatched_quantity, processed_quantity')
    .eq('facility_id', data.facility_id)
    .eq('category', data.category)
    .maybeSingle();
  if (invError) throw invError;

  if (!inv) return { success: false, error: 'No inventory record found for this category' };

  const available = (inv.processed_quantity || 0) - (inv.dispatched_quantity || 0);
  if (data.quantity_kg > available) {
    return {
      success: false,
      error: `Dispatch quantity (${data.quantity_kg}kg) exceeds available storage (${available}kg)`,
    };
  }

  // Create dispatch record
  const { data: record, error: createError } = await supabase
    .from('dispatch_records')
    .insert({
      facility_id: data.facility_id,
      category: data.category,
      quantity_kg: data.quantity_kg,
      destination: data.destination,
      status: 'Dispatched',
      dispatched_by: data.dispatched_by,
      dispatched_at: new Date().toISOString(),
      scheduled_date: data.scheduled_date,
      notes: data.notes,
      material_requirement_id: data.material_requirement_id,
    })
    .select()
    .single();
  if (createError) throw createError;

  // Update inventory: increase dispatched, decrease stored
  const newDispatched = (inv.dispatched_quantity || 0) + data.quantity_kg;
  const newStored = (inv.stored_quantity || 0) - data.quantity_kg;

  const { error: updateInvError } = await supabase
    .from('storage_inventory')
    .update({
      dispatched_quantity: newDispatched,
      stored_quantity: newStored,
      last_updated: new Date().toISOString(),
    })
    .eq('facility_id', data.facility_id)
    .eq('category', data.category);
  if (updateInvError) throw updateInvError;

  // Update smart bin
  const { data: bin } = await supabase
    .from('smart_bins')
    .select('current_quantity, max_capacity')
    .eq('facility_id', data.facility_id)
    .eq('category', data.category)
    .maybeSingle();

  if (bin) {
    const newBinQty = Math.max(0, (bin.current_quantity || 0) - data.quantity_kg);
    const fillPct = (newBinQty / bin.max_capacity) * 100;
    const status = fillPct >= 100 ? 'Full' : fillPct >= 80 ? 'Nearly Full' : 'Normal';
    await supabase
      .from('smart_bins')
      .update({
        current_quantity: newBinQty,
        status,
        last_updated: new Date().toISOString(),
      })
      .eq('facility_id', data.facility_id)
      .eq('category', data.category);
  }

  // Update material requirement if linked
  if (data.material_requirement_id) {
    await supabase
      .from('material_requirements')
      .update({ status: 'Dispatched' })
      .eq('id', data.material_requirement_id);
  }

  // Log to history
  await supabase.from('system_history').insert({
    facility_id: data.facility_id,
    category: 'Dispatch',
    action: 'Waste dispatched',
    entity_type: 'dispatch_records',
    entity_id: record.id,
    description: `Dispatched ${data.quantity_kg}kg of ${data.category} to ${data.destination}`,
    performed_by: data.dispatched_by,
  });

  return { success: true, data: record as DispatchRecord };
}
