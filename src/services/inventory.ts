import { supabase } from '@/lib/supabase';
import type { StorageInventory, WasteCategory, SmartBin } from '@/types';

export async function getInventory(facilityId: string) {
  const { data, error } = await supabase
    .from('storage_inventory')
    .select('*')
    .eq('facility_id', facilityId)
    .order('category', { ascending: true });
  if (error) throw error;
  return data as StorageInventory[];
}

export async function getSmartBins(facilityId: string) {
  const { data, error } = await supabase
    .from('smart_bins')
    .select('*')
    .eq('facility_id', facilityId)
    .order('category', { ascending: true });
  if (error) throw error;
  return data as SmartBin[];
}

export async function updateBinCapacity(facilityId: string, category: WasteCategory, maxCapacity: number) {
  const { error } = await supabase
    .from('smart_bins')
    .update({ max_capacity: maxCapacity })
    .eq('facility_id', facilityId)
    .eq('category', category);
  if (error) throw error;
}

export async function updateBinQuantity(facilityId: string, category: WasteCategory, quantity: number) {
  const fillPercent = 0;
  const status = 'Normal';
  const { error } = await supabase
    .from('smart_bins')
    .update({
      current_quantity: quantity,
      status,
      last_updated: new Date().toISOString(),
    })
    .eq('facility_id', facilityId)
    .eq('category', category);
  if (error) throw error;

  // Re-fetch to get computed fields
  const { data } = await supabase
    .from('smart_bins')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('category', category)
    .maybeSingle();
  return data;
}

export async function addToBin(facilityId: string, category: WasteCategory, quantityKg: number) {
  const { data: bin, error: fetchError } = await supabase
    .from('smart_bins')
    .select('current_quantity, max_capacity')
    .eq('facility_id', facilityId)
    .eq('category', category)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!bin) return;

  const newQty = (bin.current_quantity || 0) + quantityKg;
  const fillPct = (newQty / bin.max_capacity) * 100;
  const status = fillPct >= 100 ? 'Full' : fillPct >= 80 ? 'Nearly Full' : 'Normal';

  const { error: updateError } = await supabase
    .from('smart_bins')
    .update({
      current_quantity: newQty,
      status,
      last_updated: new Date().toISOString(),
    })
    .eq('facility_id', facilityId)
    .eq('category', category);
  if (updateError) throw updateError;
}

export async function updateStorageCapacity(facilityId: string, category: WasteCategory, capacity: number) {
  const { error } = await supabase
    .from('storage_inventory')
    .update({ storage_capacity: capacity })
    .eq('facility_id', facilityId)
    .eq('category', category);
  if (error) throw error;
}

export async function processWaste(
  facilityId: string,
  category: WasteCategory,
  quantityKg: number,
  performedBy: string,
) {
  // Add to smart bin
  await addToBin(facilityId, category, quantityKg);

  // Update storage inventory: increase processed and stored
  const { data: inv, error: invError } = await supabase
    .from('storage_inventory')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('category', category)
    .maybeSingle();
  if (invError) throw invError;
  if (!inv) return;

  const newProcessed = (inv.processed_quantity || 0) + quantityKg;
  const newStored = (inv.stored_quantity || 0) + quantityKg;

  const { error: updateError } = await supabase
    .from('storage_inventory')
    .update({
      processed_quantity: newProcessed,
      stored_quantity: newStored,
      last_updated: new Date().toISOString(),
    })
    .eq('facility_id', facilityId)
    .eq('category', category);
  if (updateError) throw updateError;

  // Log to history
  await supabase.from('system_history').insert({
    facility_id: facilityId,
    category: 'Storage',
    action: 'Waste processed',
    entity_type: 'storage_inventory',
    description: `Processed ${quantityKg}kg of ${category}. Total processed: ${newProcessed}kg, stored: ${newStored}kg`,
    performed_by: performedBy,
  });

  // Update material requirements available
  await updateRequirementAvailability(facilityId, category, newStored);
}

async function updateRequirementAvailability(facilityId: string, category: WasteCategory, availableQty: number) {
  const { data: reqs } = await supabase
    .from('material_requirements')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('category', category)
    .in('status', ['Collecting']);

  if (!reqs || reqs.length === 0) return;

  for (const req of reqs) {
    if (availableQty >= req.required_quantity) {
      await supabase
        .from('material_requirements')
        .update({
          available_quantity: availableQty,
          status: 'Requirement Fulfilled',
          fulfilled_at: new Date().toISOString(),
        })
        .eq('id', req.id);
    } else {
      await supabase
        .from('material_requirements')
        .update({ available_quantity: availableQty })
        .eq('id', req.id);
    }
  }
}
