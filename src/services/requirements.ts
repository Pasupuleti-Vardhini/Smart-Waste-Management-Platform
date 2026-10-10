import { supabase } from '@/lib/supabase';
import type { MaterialRequirement, WasteCategory } from '@/types';

export async function getRequirements(facilityId: string) {
  const { data, error } = await supabase
    .from('material_requirements')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as MaterialRequirement[];
}

export async function createRequirement(data: {
  facility_id: string;
  category: WasteCategory;
  required_quantity: number;
  unit: string;
  target_date?: string;
  notes?: string;
  created_by: string;
}) {
  const { data: result, error } = await supabase
    .from('material_requirements')
    .insert(data)
    .select()
    .single();
  if (error) throw error;

  // Check if available already meets requirement
  const { data: inv } = await supabase
    .from('storage_inventory')
    .select('stored_quantity')
    .eq('facility_id', data.facility_id)
    .eq('category', data.category)
    .maybeSingle();

  if (inv && inv.stored_quantity >= data.required_quantity) {
    await supabase
      .from('material_requirements')
      .update({
        available_quantity: inv.stored_quantity,
        status: 'Requirement Fulfilled',
        fulfilled_at: new Date().toISOString(),
      })
      .eq('id', result.id);
  } else if (inv) {
    await supabase
      .from('material_requirements')
      .update({ available_quantity: inv.stored_quantity })
      .eq('id', result.id);
  }

  await supabase.from('system_history').insert({
    facility_id: data.facility_id,
    category: 'Storage',
    action: 'Material requirement created',
    entity_type: 'material_requirements',
    entity_id: result.id,
    description: `Created requirement: ${data.required_quantity}kg of ${data.category}`,
    performed_by: data.created_by,
  });

  return result as MaterialRequirement;
}

export async function deleteRequirement(id: string) {
  const { error } = await supabase.from('material_requirements').delete().eq('id', id);
  if (error) throw error;
}
